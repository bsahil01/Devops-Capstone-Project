pipeline {
    agent any

    triggers {
        // Trigger automatically after Git push via GitHub webhook or SCM polling
        githubPush()
        pollSCM('H/5 * * * *')
    }

    environment {
        APP_NAME = 'employee-management-devops'
        IMAGE_NAME = 'employee-management-app'
        DOCKER_TAG = "${env.BUILD_NUMBER ?: 'latest'}"
        NODE_ENV = 'test'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
        timeout(time: 20, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout SCM') {
            steps {
                echo "📥 [Phase 1: Git] Checking out source repository from Git..."
                checkout scm
                script {
                    sh 'git log -1 --stat'
                }
            }
        }

        stage('Environment Check') {
            steps {
                echo "🔍 Checking toolchain versions..."
                sh 'node --version'
                sh 'npm --version'
                sh 'docker --version || true'
            }
        }

        stage('Automatic Build') {
            steps {
                echo "⚙️ [Phase 2: CI] Installing dependencies and building project..."
                sh 'npm ci --prefer-offline || npm install'
            }
        }

        stage('Automatic Testing') {
            steps {
                echo "🧪 [Phase 2: CI] Executing automated unit and integration tests..."
                sh 'npm test'
            }
        }

        stage('Automatic Packaging') {
            steps {
                echo "📦 [Phase 2: CI] Generating production release package bundle..."
                sh 'npm run package'
            }
        }

        stage('Docker Image Build') {
            steps {
                echo "🐳 [Phase 3: Docker] Building container image..."
                sh "docker build -t ${IMAGE_NAME}:${DOCKER_TAG} -t ${IMAGE_NAME}:latest ."
            }
        }

        stage('Container Smoke Test') {
            steps {
                echo "🩺 [Phase 3: Docker] Verifying application container health..."
                sh """
                    docker run -d --name smoke-test-app -p 3001:3000 -e PORT=3000 ${IMAGE_NAME}:${DOCKER_TAG}
                    sleep 5
                    curl --fail --retry 5 --retry-delay 2 http://localhost:3001/api/health || (docker logs smoke-test-app && exit 1)
                    docker stop smoke-test-app
                    docker rm smoke-test-app
                """
            }
        }
    }

    post {
        always {
            echo "🧹 Cleaning up temporary test containers..."
            sh 'docker rm -f smoke-test-app 2>/dev/null || true'
            archiveArtifacts artifacts: 'dist/*.tar.gz', allowEmptyArchive: true, fingerprint: true
        }
        success {
            echo "✅ ========================================================"
            echo "🎉 Pipeline completed successfully!"
            echo "   Docker Image: ${IMAGE_NAME}:${DOCKER_TAG}"
            echo "   Status: All tests passed & artifact packaged"
            echo "✅ ========================================================"
        }
        failure {
            echo "❌ ========================================================"
            echo "💥 Pipeline execution FAILED!"
            echo "   Please inspect build console logs for failure details."
            echo "❌ ========================================================"
        }
    }
}
