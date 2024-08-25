pipeline {
    agent any

    stages {
        stage('Checkout latest commit') {
            steps {
                git url: 'https://github.com/itsmevjnk/fhserver.git', branch: 'main'
            }
        }
        
        stage('Build') {
            steps {
                sh '''
                    docker build -t itsmevjnk/fhserver:${BUILD_NUMBER} .
                    docker save itsmevjnk/fhserver:${BUILD_NUMBER} | gzip > fhserver_${BUILD_NUMBER}.tar.gz
                '''
            }
            
            post {
                success {
                    archiveArtifacts artifacts: 'fhserver.tar.gz'
                }
            }
        }
        
        stage('Test') {
            steps {
                sh '''
                    mkdir -p files && chmod 777 files
                    docker run -dt -v ./files:/files -p 3000 --name fhserver_jenkins_${BUILD_NUMBER} itsmevjnk/fhserver:${BUILD_NUMBER}
                    PORT=$(docker port fhserver_jenkins_${BUILD_NUMBER} | gawk 'match($0, /^.*:(.*)$/, a) {print a[1]}' | head -n 1)
                    npm install --dev
                    URL="http://127.0.0.1:$PORT" npm test
                '''
            }
            
            post {
                always {
                    sh '''
                        docker logs fhserver_jenkins_${BUILD_NUMBER} > test_container.log
                        docker stop fhserver_jenkins_${BUILD_NUMBER}
                        docker rm fhserver_jenkins_${BUILD_NUMBER}
                    '''
                    archiveArtifacts artifacts: 'test_container.log'
                }
            }
        }

        stage('Code quality analysis - SonarQube (staging)') {
            environment {
                SCANNER_HOME = tool 'SonarQubeScanner';
            }

            steps {
                withSonarQubeEnv('SonarQube') {
                    sh '${SCANNER_HOME}/bin/sonar-scanner'
                }
            }
        }

        stage('Code quality analysis - Snyk') {
            steps {
                snykSecurity(
                    snykInstallation: 'Snyk',
                    snykTokenId: 'snyk-token'
                )
            }
        }

        stage('Code quality analysis - SonarQube (wait for completion)') {
            steps {
                timeout(time: 1, unit: 'HOURS') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Deploy to staging') {
            steps {
                sh '''
                    docker stop fhserver_staging || true
                    docker rm fhserver_staging || true
                    docker run -dt -v ./files:/files -p 3000:3000 --name fhserver_staging itsmevjnk/fhserver:${BUILD_NUMBER}
                ''' // reuse container from testing stage
                echo 'Staging server is available on https://itsmevjnk.mooo.com/vm/fhserver'
            }
        }

        stage('Wait for release approval') {
            steps {
                timeout(time: 3, unit: 'DAYS') {
                    input message: 'Do you want to release this build to Docker Hub?', ok: 'Yes'
                }
            }
        }

        stage('Release') {
            steps {
                sh '''
                    docker push itsmevjnk/fhserver:${BUILD_NUMBER}
                    
                    docker tag itsmevjnk/fhserver:${BUILD_NUMBER} itsmevjnk/fhserver:latest
                    docker push itsmevjnk/fhserver:latest
                '''
            }
        }
    }
}
