import multiprocessing

# Binding to a unix socket is efficient for Nginx on the same machine
# or we can use localhost port. Sticking to port 8000 for simplicity as before,
# or user's image showed a sock file. Let's use the socket to match the user's likely direction/Image hint.
# BUT, simplest for a robust guide is often a port.
# However, the user image shows `mi_app.sock`. I will use that to match their likely setup attempt.
bind = "unix:{{APP_DIR}}/mi_app.sock"

# Workers
workers = multiprocessing.cpu_count() * 2 + 1
threads = 2

# Timeout
timeout = 120

# Logging (Redirect to stdout/stderr or specific files)
# Using standard paths inside the home or var logs.
accesslog = "{{LOG_DIR}}/gunicorn-access.log"
errorlog = "{{LOG_DIR}}/gunicorn-error.log"
loglevel = "info"

# Process Name
proc_name = "webiso_app"
