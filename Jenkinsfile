def REGISTRY = '://microsoft.com'
def IMAGE_TAG = 'playwright:v1.58.2-noble'

pipeline {
    agent {
        docker {
            image "${REGISTRY}/${IMAGE_TAG}"
            args '--init --ipc=host -u root'
            reuseNode true
        }
    }

    parameters {
        choice(name: 'ENVIRONMENT', choices: ['qa', 'staging', 'prod'], description: 'Target environment')
        choice(name: 'BROWSER', choices: ['chromium', 'firefox', 'webkit', 'all'], description: 'Browser to run')
        string(name: 'GREP_TAG', defaultValue: '', description: 'Optional test tag to run (e.g., @smoke)')
    }

    options {
        timeout(time: 45, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '20'))
        timestamps()
        ansiColor('xterm')
    }

    environment {
        CI = 'true'
        TEST_ENV = "${params.ENVIRONMENT}"
    }

    stages {
        stage('Clean Workspace') {
            steps {
                sh 'rm -rf test-results playwright-report blob-report'
            }
        }

        stage('Install Dependencies') {
            steps {
                sh '''
                    node -v
                    npm -v
                    npm ci
                '''
            }
        }

        stage('Type Check') {
            steps {
                sh 'npx tsc --noEmit --skipLibCheck tests/userManagement.spec.ts'
            }
        }

        stage('Run Playwright Tests') {
            steps {
                script {
                    def projectFlag = params.BROWSER == 'all' ? '' : "--project=${params.BROWSER}"
                    def grepFlag = params.GREP_TAG?.trim() ? "--grep \"${params.GREP_TAG.trim()}\"" : ''

                    catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                        sh "npx playwright test ${projectFlag} ${grepFlag}"
                    }
                }
            }
        }
    }

    post {
        always {
            junit allowEmptyResults: true, testResults: 'test-results/junit-report.xml'

            publishHTML(target: [
                allowMissing: true,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'playwright-report',
                reportFiles: 'index.html',
                reportName: 'Playwright HTML Report'
            ])

            archiveArtifacts artifacts: 'test-results/**/*', allowEmptyArchive: true
        }
        cleanup {
            sh 'chmod -R 777 test-results playwright-report || true'
        }
    }
}
