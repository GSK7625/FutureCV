// Multibranch Pipeline: one Linux agent with Docker access and label "docker".
def ci
def services = []

pipeline {
    agent { label 'docker' }
    options {
        skipDefaultCheckout(true)
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
        timeout(time: 60, unit: 'MINUTES')
    }
    parameters {
        booleanParam(name: 'FULL_BUILD', defaultValue: false, description: 'Run all services, ignoring changed paths')
        booleanParam(name: 'BUILD_IMAGES', defaultValue: true, description: 'Build runtime images after all selected checks pass')
        booleanParam(name: 'PUSH_IMAGES', defaultValue: false, description: 'Publish all images on develop/master using dockerhub-creds')
        string(name: 'IMAGE_PREFIX', defaultValue: '', description: 'Registry host/namespace, e.g. docker.io/your-team; required for push')
        string(name: 'VITE_API_URL', defaultValue: '', description: 'Public API origin; empty uses same-origin /api through the web proxy')
    }
    stages {
        stage('Checkout') {
            steps {
                deleteDir()
                checkout scm
                script {
                    ci = load 'jenkins/ci.groovy'
                    if (params.PUSH_IMAGES && (!params.BUILD_IMAGES || env.CHANGE_ID ||
                        !(env.BRANCH_NAME in ['develop', 'master']))) {
                        error('Push requires BUILD_IMAGES and a trusted develop/master branch build.')
                    }
                    if (params.PUSH_IMAGES && !params.IMAGE_PREFIX?.trim()) {
                        error('Set IMAGE_PREFIX to your real registry host/namespace before publishing.')
                    }
                    env.IMAGE_PREFIX = params.IMAGE_PREFIX?.trim() ?: 'futurecv'
                    if (!(env.IMAGE_PREFIX ==~ /[a-z0-9][a-z0-9.:-]*(\/[a-z0-9][a-z0-9._-]*)*/)) {
                        error('IMAGE_PREFIX must be a lowercase registry host/namespace without a URL scheme.')
                    }
                    if (params.PUSH_IMAGES && !env.IMAGE_PREFIX.contains('/')) {
                        error('Publishing requires a registry host and namespace, e.g. docker.io/your-team.')
                    }
                    env.IMAGE_TAG = env.GIT_COMMIT.take(12)
                    // Publishing always produces every image at the same revision.
                    services = ci.changedServices(params.FULL_BUILD || params.PUSH_IMAGES)
                    echo "Selected services: ${services.join(', ') ?: '(documentation only)'}"
                }
            }
        }
        stage('CI') {
            parallel {
                stage('Frontend') {
                    when { expression { services.contains('frontend') } }
                    steps { script { ci.frontend() } }
                }
                stage('Backend .NET') {
                    when { expression { services.contains('backend') } }
                    steps { script { ci.backend() } }
                }
                stage('Backend AI') {
                    when { expression { services.contains('backend-ai') } }
                    steps { script { ci.backendAi() } }
                }
            }
        }
        stage('Build images') {
            when { expression { params.BUILD_IMAGES && !services.isEmpty() } }
            steps {
                script {
                    services.each { service ->
                        ci.buildImage(service, env.IMAGE_PREFIX, env.IMAGE_TAG, params.VITE_API_URL)
                    }
                }
            }
        }
        stage('Push images') {
            when { expression { params.PUSH_IMAGES } }
            steps {
                script {
                    def registryHost = env.IMAGE_PREFIX.tokenize('/')[0]
                    docker.withRegistry("https://${registryHost}", 'dockerhub-creds') {
                        services.each { service ->
                            docker.image("${env.IMAGE_PREFIX}/${service}:${env.IMAGE_TAG}").push()
                        }
                    }
                }
            }
        }
    }
    post { always { deleteDir() } }
}
