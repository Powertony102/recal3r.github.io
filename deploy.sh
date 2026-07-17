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

# 检测宝塔面板
IS_BT_PANEL=false
NGINX_BIN=""
NGINX_CONF_DIR=""
NGINX_CONF_TEST_CMD=""
NGINX_RELOAD_CMD=""

if [[ -x "/www/server/nginx/sbin/nginx" ]]; then
    IS_BT_PANEL=true
    NGINX_BIN="/www/server/nginx/sbin/nginx"
    NGINX_CONF_DIR="/www/server/panel/vhost/nginx"
    NGINX_CONF_TEST_CMD="${NGINX_BIN} -t"
    NGINX_RELOAD_CMD="${NGINX_BIN} -s reload"
    log_info "检测到宝塔面板，使用宝塔 Nginx 配置..."

    # 清理之前可能写入的系统 Nginx 配置，避免冲突
    SYSTEM_NGINX_CONF="/etc/nginx/conf.d/${DOMAIN}.conf"
    if [[ -f "${SYSTEM_NGINX_CONF}" ]]; then
        log_warn "发现系统 Nginx 配置文件，为避免冲突，已移除: ${SYSTEM_NGINX_CONF}"
        rm -f "${SYSTEM_NGINX_CONF}"
    fi
else
    NGINX_BIN="nginx"
    NGINX_CONF_DIR="/etc/nginx/conf.d"
    NGINX_CONF_TEST_CMD="nginx -t"
    NGINX_RELOAD_CMD="nginx -s reload"
    log_info "未检测到宝塔面板，使用系统 Nginx..."
fi

# 安装 nginx（如果未安装且非宝塔环境）
if [[ "${IS_BT_PANEL}" != "true" ]] && ! command -v nginx &> /dev/null; then
    log_info "检查并安装 Nginx..."
    export DEBIAN_FRONTEND=noninteractive
    if command -v apt-get &> /dev/null; then
        apt-get update -qq
        apt-get install -y -qq -o Dpkg::Options::="--force-confnew" nginx curl
    elif command -v yum &> /dev/null; then
        yum install -y nginx curl
    else
        log_error "无法自动安装 Nginx，请手动安装后再试。"
        exit 1
    fi
elif [[ "${IS_BT_PANEL}" == "true" ]]; then
    log_info "宝塔 Nginx 已存在，跳过安装步骤。"
else
    log_info "系统 Nginx 已安装，跳过安装步骤。"
fi

# 处理宝塔面板生成的不可变 .user.ini 文件
if [[ -f "${WEB_ROOT}/.user.ini" ]]; then
    log_info "移除 .user.ini 的不可变属性..."
    chattr -i "${WEB_ROOT}/.user.ini" 2>/dev/null || true
fi

# 设置权限
log_info "设置文件权限..."
chown -R www:www "${WEB_ROOT}" 2>/dev/null || chown -R www-data:www-data "${WEB_ROOT}"
chmod -R 755 "${WEB_ROOT}"

# 生成 Nginx 配置（直接静态文件服务）
NGINX_CONF="${NGINX_CONF_DIR}/${DOMAIN}.conf"
log_info "写入 Nginx 配置文件: ${NGINX_CONF}"

# 宝塔面板需要这个标记来定位 SSL 配置插入位置
BT_SSL_MARKER=""
if [[ "${IS_BT_PANEL}" == "true" ]]; then
    BT_SSL_MARKER="    #error_page 404/404.html;"
fi

cat > "${NGINX_CONF}" <<EOF
server {
    listen 80;
    server_name ${DOMAIN};
    root ${WEB_ROOT};
    index index.html;
${BT_SSL_MARKER}

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
${NGINX_CONF_TEST_CMD}

log_info "重载 Nginx..."
${NGINX_RELOAD_CMD}

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
