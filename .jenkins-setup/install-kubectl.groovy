import jenkins.model.Jenkins

def log = { msg -> println "[install-tools] ${msg}" }

log "=== INSTALL KUBECTL IN JENKINS HOME ==="
try {
    def home = "/var/jenkins_home"
    def binDir = new File(home, "bin")
    binDir.mkdirs()
    def kubectlFile = new File(binDir, "kubectl")

    def version = "v1.36.1"
    def url = "https://dl.k8s.io/release/${version}/bin/linux/amd64/kubectl"

    // Only download if not present or version mismatch
    def needsDownload = true
    if (kubectlFile.exists()) {
        def proc = ["bash", "-c", "${kubectlFile.absolutePath} version --client 2>&1"].execute()
        proc.waitFor()
        def out = proc.text
        if (out.contains("v1.36")) {
            log "kubectl v1.36.1 already installed"
            needsDownload = false
        } else {
            log "kubectl exists but wrong version, re-downloading"
        }
    }

    if (needsDownload) {
        log "Downloading kubectl from ${url}"
        def proc = ["bash", "-c", "curl -sL -o ${kubectlFile.absolutePath} ${url} && chmod +x ${kubectlFile.absolutePath} && echo OK"].execute()
        proc.waitFor()
        def out = proc.text.trim()
        if (out == "OK") {
            log "kubectl installed: ${kubectlFile.length()} bytes"
        } else {
            log "WARN: kubectl download may have failed: ${out}"
        }
    }

    // Also copy kubeconfigs if not present
    def kubeconfigDir = new File(home, "kubeconfigs")
    if (kubeconfigDir.exists() && kubeconfigDir.list()?.length > 0) {
        log "kubeconfigs already present: ${kubeconfigDir.list().length} files"
    } else {
        log "WARN: kubeconfigs directory empty or missing — create credentials from .jenkins-setup/kubeconfig/*.yaml files"
    }

    log "kubectl path: ${kubectlFile.absolutePath}"
} catch (Exception e) {
    log "ERROR: ${e.message}"
}

log "=== DONE ==="
