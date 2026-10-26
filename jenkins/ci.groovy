// Repository-local helpers; no Global Pipeline Library configuration required.
def changedServices(boolean fullBuild = false) {
    def all = ['frontend', 'backend', 'backend-ai']
    if (fullBuild || !env.GIT_PREVIOUS_SUCCESSFUL_COMMIT) {
        return all
    }
    if (sh(returnStatus: true, script: 'git cat-file -e "$GIT_PREVIOUS_SUCCESSFUL_COMMIT^{commit}"') != 0) {
        return all
    }
    def paths = sh(returnStdout: true,
        script: 'git diff --name-only "$GIT_PREVIOUS_SUCCESSFUL_COMMIT" HEAD').trim().readLines()
    if (paths.any { it == 'Jenkinsfile' || it.startsWith('jenkins/') }) {
        return all
    }
    return all.findAll { service ->
        paths.any { path ->
            path.startsWith("${service}/") ||
                (service == 'backend' && path.startsWith('backend-ai/tests/fixtures/contracts/'))
        }
    }
}

def frontend() {
    docker.image('node:24-bookworm-slim').inside {
        withEnv(["npm_config_cache=${env.WORKSPACE}/.ci-cache/npm", 'CI=true']) {
            dir('frontend') {
                sh 'npm ci --include=dev --no-audit --no-fund'
                sh 'npm run typecheck'
                try {
                    sh 'npm run test:ci'
                } finally {
                    junit testResults: 'test-results.xml', skipPublishingChecks: true
                }
                sh 'npm run build'
                archiveArtifacts artifacts: 'build/client/**', fingerprint: true
            }
        }
    }
}

def backend() {
    docker.image('mcr.microsoft.com/dotnet/sdk:8.0').inside {
        withEnv(['DOTNET_CLI_TELEMETRY_OPTOUT=1', 'DOTNET_NOLOGO=1',
                 "DOTNET_CLI_HOME=${env.WORKSPACE}/.ci-cache/dotnet",
                 "NUGET_PACKAGES=${env.WORKSPACE}/.ci-cache/nuget"]) {
            dir('backend') {
                sh 'dotnet restore FutureCV.sln'
                sh 'dotnet build FutureCV.sln -c Release --no-restore'
                try {
                    // Existing integration tests use EF InMemory and fake HTTP handlers.
                    sh '''dotnet test FutureCV.sln -c Release --no-build \
                        --logger "trx;LogFileName=test-results.trx" \
                        --results-directory test-results --collect "XPlat Code Coverage"'''
                } finally {
                    mstest testResultsFile: 'test-results/*.trx', failOnError: true
                    archiveArtifacts artifacts: 'test-results/**', allowEmptyArchive: true
                }
                sh 'dotnet publish src/FutureCV.Api/FutureCV.Api.csproj -c Release --no-build -o publish'
                archiveArtifacts artifacts: 'publish/**', fingerprint: true
            }
        }
    }
}

def backendAi() {
    docker.image('python:3.11-slim').inside {
        withEnv(['ENV=test', 'LLM_PROVIDER=mock', 'EMBEDDING_PROVIDER=mock',
                 'MATCHING_ALGORITHM=matching-v0', 'SEMANTIC_MODE=advisory',
                 'INTERNAL_API_KEY=', 'GEMINI_API_KEY=', 'GEMINI_LLM_API_KEY=',
                 'GEMINI_EMBEDDING_API_KEY=', 'OPENAI_API_KEY=',
                 'PIP_DISABLE_PIP_VERSION_CHECK=1', 'PYTHONUNBUFFERED=1']) {
            dir('backend-ai') {
                sh '''python -m venv .venv-ci
                    .venv-ci/bin/python -m pip install -r requirements-dev.txt
                    .venv-ci/bin/python -m compileall -q app tests
                    .venv-ci/bin/python -m ruff check app tests
                    .venv-ci/bin/python -m ruff format --check app tests
                    .venv-ci/bin/python -m mypy app'''
                try {
                    sh '.venv-ci/bin/python -m pytest tests --junitxml=test-results.xml -q'
                } finally {
                    junit testResults: 'test-results.xml', skipPublishingChecks: true
                }
            }
        }
    }
}

def buildImage(String service, String prefix, String tag, String apiUrl = '') {
    withEnv(["BUILD_SERVICE=${service}", "BUILD_IMAGE=${prefix}/${service}:${tag}",
             "BUILD_API_URL=${apiUrl ?: ''}"]) {
        if (service == 'frontend') {
            sh 'docker build --build-arg "VITE_API_URL=$BUILD_API_URL" -t "$BUILD_IMAGE" frontend'
        } else {
            sh 'docker build -t "$BUILD_IMAGE" "$BUILD_SERVICE"'
        }
    }
}

return this
