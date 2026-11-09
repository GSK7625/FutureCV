// ─────────────────────────────────────────────────────────────────────────────
// FutureCV — Jenkins Credential Bootstrap (init.groovy.d)
// ─────────────────────────────────────────────────────────────────────────────
// Idempotent: chạy lại nhiều lần không tạo trùng.
//
// Nguồn: file trong .jenkins-setup/secrets/ (KHÔNG commit — đã .gitignore).
// Copy file này vào: <JENKINS_HOME>/init.groovy.d/00-futurecv-credentials.groovy
// Copy secrets vào:    <JENKINS_HOME>/futurecv-secrets/
//
// Biến môi trường override (ưu tiên cao hơn file):
//   FUTURECV_SECRETS_DIR     — thư mục chứa file secret (mặc định /var/jenkins_home/futurecv-secrets)
//   FUTURECV_DOCKERHUB_USER  — username Docker Hub
//   FUTURECV_DOCKERHUB_TOKEN — access token Docker Hub
//   FUTURECV_GEMINI_API_KEY  — Gemini API key
//   FUTURECV_ROTATE_IDS      — danh sách credential ID cần rotate (phân cách bởi dấu phẩy)
//                               vd: "internal-api-key,jwt-signing-key"
// ─────────────────────────────────────────────────────────────────────────────

import com.cloudbees.plugins.credentials.Credentials
import com.cloudbees.plugins.credentials.CredentialsScope
import com.cloudbees.plugins.credentials.SecretBytes
import com.cloudbees.plugins.credentials.SystemCredentialsProvider
import com.cloudbees.plugins.credentials.domains.Domain
import com.cloudbees.plugins.credentials.impl.UsernamePasswordCredentialsImpl
import hudson.util.Secret
import org.jenkinsci.plugins.plaincredentials.impl.FileCredentialsImpl
import org.jenkinsci.plugins.plaincredentials.impl.StringCredentialsImpl

def log = { msg -> println "[futurecv-creds] ${msg}" }

def secretsDir = new File(
    System.getenv("FUTURECV_SECRETS_DIR") ?: "/var/jenkins_home/futurecv-secrets")

def kubeconfigDir = new File(
    System.getenv("FUTURECV_KUBECONFIG_DIR") ?: "/var/jenkins_home/futurecv-kubeconfig")

def rotateIds = (System.getenv("FUTURECV_ROTATE_IDS") ?: "")
    .split(",")
    .collect { it.trim() }
    .findAll { it }

def provider = SystemCredentialsProvider.getInstance()

// Work on a mutable copy of the domain → credentials map.
def domainMap = new LinkedHashMap<Domain, List<Credentials>>(
    provider.getDomainCredentialsMap() ?: [:])

// Locate (or create) the global domain bucket.
def globalDomain = null
def globalList = null
domainMap.each { d, creds ->
    if (d != null && d.isGlobal()) {
        globalDomain = d
        globalList = creds
    }
}
if (globalDomain == null) {
    globalDomain = Domain.global()
    globalList = []
    domainMap.put(globalDomain, globalList)
}

def readSecret = { String filename ->
    if (!secretsDir.exists()) {
        return null
    }
    def f = new File(secretsDir, filename)
    if (!f.exists()) {
        return null
    }
    def v = f.getText("UTF-8").trim()
    // Bỏ qua placeholder chưa được điền thật
    if (!v || v.startsWith("__REPLACE_WITH")) {
        return null
    }
    return v
}

def findIndex = { String credId ->
    return globalList.findIndexOf { it.id == credId }
}

def shouldRotate = { String credId -> rotateIds.contains(credId) }

def upsertString = { String credId, String description, String value ->
    if (!value) {
        log "SKIP ${credId} — no value available"
        return
    }
    def idx = findIndex(credId)
    if (idx >= 0) {
        if (!shouldRotate(credId)) {
            log "EXISTS ${credId} — kept (set FUTURECV_ROTATE_IDS to update)"
            return
        }
        globalList.remove(idx)
        log "ROTATE ${credId} — old value removed"
    }
    globalList.add(new StringCredentialsImpl(
        CredentialsScope.GLOBAL, credId, description,
        Secret.fromString(value)))
    log "CREATED ${credId}"
}

def upsertUsernamePassword = { String credId, String description, String username, String password ->
    if (!username || !password) {
        log "SKIP ${credId} — missing username or password"
        return
    }
    def idx = findIndex(credId)
    if (idx >= 0) {
        if (!shouldRotate(credId)) {
            log "EXISTS ${credId} — kept (set FUTURECV_ROTATE_IDS to update)"
            return
        }
        globalList.remove(idx)
        log "ROTATE ${credId} — old value removed"
    }
    globalList.add(new UsernamePasswordCredentialsImpl(
        CredentialsScope.GLOBAL, credId, description,
        username, password))
    log "CREATED ${credId}"
}

def upsertFile = { String credId, String description, String filename ->
    // Tìm file trong secretsDir trước, sau đó tới kubeconfigDir
    def f = new File(secretsDir, filename)
    if (!f.exists()) {
        def alt = new File(kubeconfigDir, filename)
        if (alt.exists()) {
            f = alt
        }
    }
    if (!f.exists()) {
        log "SKIP ${credId} — file not found: ${filename} (searched ${secretsDir}, ${kubeconfigDir})"
        return
    }
    def idx = findIndex(credId)
    if (idx >= 0) {
        if (!shouldRotate(credId)) {
            log "EXISTS ${credId} — kept"
            return
        }
        globalList.remove(idx)
        log "ROTATE ${credId} — old value removed"
    }
    globalList.add(new FileCredentialsImpl(
        CredentialsScope.GLOBAL, credId, description,
        f.getAbsolutePath(), SecretBytes.fromString(f.getText("UTF-8"))))
    log "CREATED ${credId} (from ${f.name})"
}

log "=== BOOTSTRAP FUTURECV CREDENTIALS ==="
log "secrets dir : ${secretsDir} (exists=${secretsDir.exists()})"
log "rotate ids  : ${rotateIds.isEmpty() ? '(none)' : rotateIds.join(', ')}"

upsertString("jwt-signing-key",
    "JWT signing key for backend .NET (HS256, >=32 chars)",
    readSecret("jwt-signing-key.txt"))

upsertString("internal-api-key",
    "Pre-shared secret backend .NET <-> backend-ai (X-Internal-API-Key)",
    readSecret("internal-api-key.txt"))

upsertString("db-connection-string",
    "PostgreSQL connection string for backend .NET (ConnectionStrings:DefaultConnection)",
    readSecret("db-connection-string.txt"))

upsertString("gemini-api-key",
    "Gemini API key for backend-ai (GEMINI_API_KEY)",
    readSecret("gemini-api-key.txt") ?: System.getenv("FUTURECV_GEMINI_API_KEY"))

upsertUsernamePassword("dockerhub-creds",
    "Docker Hub credentials for pushing images",
    System.getenv("FUTURECV_DOCKERHUB_USER") ?: readSecret("dockerhub-username.txt"),
    System.getenv("FUTURECV_DOCKERHUB_TOKEN") ?: readSecret("dockerhub-token.txt"))

// ── Kubernetes kubeconfigs (Secret file) ──────────────────────────────
upsertFile("kubeconfig-dev",
    "Kubernetes dev cluster (kind desktop-control-plane) - namespace futurecv-dev",
    "kubeconfig-dev.yaml")

upsertFile("kubeconfig-staging",
    "Kubernetes staging cluster (kind desktop-control-plane) - namespace futurecv-staging",
    "kubeconfig-staging.yaml")

upsertFile("kubeconfig-prod",
    "Kubernetes prod cluster (kind desktop-control-plane) - namespace futurecv-prod",
    "kubeconfig-prod.yaml")

provider.setDomainCredentialsMap(domainMap)
provider.save()
log "total credentials in global domain: ${globalList.size()}"
log "=== DONE ==="
