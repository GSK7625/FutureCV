// Temporary verification: check dockerhub-creds can authenticate against Docker Hub.
// Prints ONLY HTTP status codes — never the credential values.
import com.cloudbees.plugins.credentials.Credentials
import com.cloudbees.plugins.credentials.common.StandardUsernamePasswordCredentials
import com.cloudbees.plugins.credentials.domains.Domain
import com.cloudbees.plugins.credentials.SystemCredentialsProvider
import java.net.HttpURLConnection
import java.net.URL
import java.util.Base64

def log = { msg -> println "[dockerhub-check] ${msg}" }

def provider = SystemCredentialsProvider.getInstance()
def domainMap = provider.getDomainCredentialsMap() ?: [:]

def all = []
domainMap.each { d, list ->
    (list ?: []).each { all << it }
}

def cred = all.find { it.id == "dockerhub-creds" }

if (cred == null) {
    log "RESULT: FAIL — credential 'dockerhub-creds' not found"
} else if (!(cred instanceof StandardUsernamePasswordCredentials)) {
    log "RESULT: FAIL — wrong kind: ${cred.getClass().simpleName}"
} else {
    log "kind: ${cred.getClass().simpleName}"
    def username = cred.getUsername()
    def password = cred.getPassword().getPlainText()
    log "username present: ${username != null && !username.isEmpty()}"
    log "password present: ${password != null && !password.isEmpty()}"
    log "password length: ${password?.length() ?: 0}"

    // 1) Docker Hub token endpoint (same auth path as `docker login`)
    def auth = Base64.getEncoder().encodeToString(
        "${username}:${password}".getBytes("UTF-8"))
    def conn = (HttpURLConnection) new URL(
        "https://hub.docker.com/v2/users/${username}/tokens").openConnection()
    conn.setRequestProperty("Authorization", "Basic ${auth}")
    conn.setRequestProperty("Content-Type", "application/json")
    conn.setRequestMethod("POST")
    conn.setConnectTimeout(15000)
    conn.setReadTimeout(15000)
    def code = conn.getResponseCode()
    log "POST /v2/users/{user}/tokens -> HTTP ${code}"

    // 2) Registry auth endpoint — the real `docker login` path
    def conn2 = (HttpURLConnection) new URL(
        "https://index.docker.io/v2/").openConnection()
    conn2.setRequestProperty("Authorization", "Basic ${auth}")
    conn2.setConnectTimeout(15000)
    conn2.setReadTimeout(15000)
    def code2 = conn2.getResponseCode()
    log "GET index.docker.io/v2/ -> HTTP ${code2}"

    if (code2 == 401) {
        log "RESULT: FAIL — registry rejected credentials"
    } else {
        log "RESULT: PASS — registry accepted credentials"
    }
}
