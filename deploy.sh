#!/usr/bin/env bash
set -euo pipefail

# 部署配置
DOMAIN="demo.tony102.com"
WEB_ROOT="/www/wwwroot/${DOMAIN}"
PORT="7561"  # 仅在使用反向代理模式时需要

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 检查 root 权限
if [[ $EUID -ne 0 ]]; then
   log_error "请使用 root 权限运行此脚本 (sudo ./deploy.sh)"
   exit 1
fi

# 检查网站目录是否存在
if [[ ! -d "${WEB_ROOT}" ]]; then
    log_error "网站目录不存在: ${WEB_ROOT}"
    echo "请先创建该目录并放入项目文件，再运行此脚本。"
    exit 1
fi

# 检查 index.html 是否存在
if [[ ! -f "${WEB_ROOT}/index.html" ]]; then
    log_warn "未在 ${WEB_ROOT} 找到 index.html，请确认网站文件已正确放置。"
fi

# 安装 nginx（如果未安装）
log_info "检查并安装 Nginx..."
export DEBIAN_FRONTEND=noninteractive
if ! command -v nginx &> /dev/null; then
    if command -v apt-get &> /dev/null; then
        apt-get update -qq
        apt-get install -y -qq -o Dpkg::Options::="--force-confnew" nginx curl
    elif command -v yum &> /dev/null; then
        yum install -y nginx curl
    else
        log_error "无法自动安装 Nginx，请手动安装后再试。"
        exit 1
    fi
else
    log_info "Nginx 已安装，跳过安装步骤。"
fi

# 设置权限
log_info "设置文件权限..."
chown -R www:www "${WEB_ROOT}" 2>/dev/null || chown -R www-data:www-data "${WEB_ROOT}"
chmod -R 755 "${WEB_ROOT}"

# 生成 Nginx 配置（直接静态文件服务）
NGINX_CONF="/etc/nginx/conf.d/${DOMAIN}.conf"
log_info "写入 Nginx 配置文件: ${NGINX_CONF}"
cat > "${NGINX_CONF}" <<EOF
server {
    listen 80;
    server_name ${DOMAIN};
    root ${WEB_ROOT};
    index index.html;

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|webp|woff|woff2|ttf|eot|otf|mp4|webm|glb|gltf)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 禁用 HTML 缓存，方便更新后即时生效
    location ~* \.html$ {
        add_header Cache-Control "no-cache";
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # 日志
    access_log /var/log/nginx/${DOMAIN}_access.log;
    error_log /var/log/nginx/${DOMAIN}_error.log;
}
EOF

# 测试并重载 Nginx
log_info "测试 Nginx 配置..."
nginx -t

log_info "重载 Nginx..."
if command -v systemctl &> /dev/null; then
    systemctl reload nginx
else
    nginx -s reload
fi

log_info "配置完成！"
echo ""
echo "=================================================="
echo "网站目录: ${WEB_ROOT}"
echo "访问地址: http://${DOMAIN}"
echo "=================================================="
echo ""
echo "提示："
echo "1. 请在 DNS 解析中将 ${DOMAIN} 指向本服务器 IP。"
echo "2. 如需 HTTPS，建议使用 certbot 或宝塔面板申请 SSL 证书。"
echo "3. 此脚本不会修改或删除 ${WEB_ROOT} 中的任何文件。"
