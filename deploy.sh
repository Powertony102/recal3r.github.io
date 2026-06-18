#!/usr/bin/env bash
set -euo pipefail

# 部署配置
DOMAIN="demo.tony102.com"
WEB_ROOT="/www/wwwroot/${DOMAIN}"
REPO_URL="https://github.com/Powertony102/tag3r.github.io.git"
BRANCH="main"
PORT="8080"  # 仅在使用反向代理模式时需要

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

# 安装基础依赖（git、nginx）
log_info "安装基础依赖..."
if command -v apt-get &> /dev/null; then
    apt-get update -qq
    apt-get install -y -qq git nginx curl
elif command -v yum &> /dev/null; then
    yum install -y git nginx curl
else
    log_warn "无法自动安装依赖，请手动安装 git 和 nginx"
fi

# 创建网站目录
log_info "创建网站目录: ${WEB_ROOT}"
mkdir -p "${WEB_ROOT}"

# 克隆/更新代码
if [[ -d "${WEB_ROOT}/.git" ]]; then
    log_info "更新已有代码..."
    cd "${WEB_ROOT}"
    git fetch origin
    git reset --hard "origin/${BRANCH}"
else
    log_info "从 GitHub 拉取代码..."
    rm -rf "${WEB_ROOT}"
    git clone --depth 1 -b "${BRANCH}" "${REPO_URL}" "${WEB_ROOT}"
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

log_info "部署完成！"
echo ""
echo "=================================================="
echo "网站已部署到: ${WEB_ROOT}"
echo "访问地址: http://${DOMAIN}"
echo "=================================================="
echo ""
echo "提示："
echo "1. 请在 DNS 解析中将 ${DOMAIN} 指向本服务器 IP。"
echo "2. 如需 HTTPS，建议使用 certbot 或宝塔面板申请 SSL 证书。"
echo "3. 若使用宝塔面板，可跳过本脚本中的 Nginx 配置步骤，"
echo "   直接在宝塔中创建站点并指定网站目录为 ${WEB_ROOT}。"
