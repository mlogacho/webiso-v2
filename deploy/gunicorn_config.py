import multiprocessing

# Bind to a local TCP port; Nginx proxies /api/ to this address
bind = "127.0.0.1:5001"

# Workers
workers = multiprocessing.cpu_count() * 2 + 1
threads = 2

# Timeout
timeout = 120

# Logging — systemd captures stderr; also write to /var/log/webiso/
accesslog = "/var/log/webiso/gunicorn-access.log"
errorlog  = "/var/log/webiso/gunicorn-error.log"
loglevel  = "info"

# Process Name
proc_name = "webiso_app"
