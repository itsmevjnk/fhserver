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
                    docker run -dt -v ./files:/files -p 3000:3000 --name fhserver_jenkins_test itsmevjnk/fhserver:${BUILD_NUMBER}
                    npm install --dev
                    npm test
                '''
            }
            
            post {
                always {
                    sh '''
                        docker logs fhserver_jenkins_test > test_container.log
                        docker stop fhserver_jenkins_test
                        docker rm fhserver_jenkins_test
                        rm -rf files
                    '''
                    archiveArtifacts artifacts: 'test_container.log'
                }
            }
        }

        stage('Code quality analysis - SonarQube') {
            environment {
                SCANNER_HOME = tool 'SonarQubeScanner';
            }

            steps {
                withSonarQubeEnv('SonarQube') {
                    sh '${SCANNER_HOME}/bin/sonar-scanner'
                }
            }
        }
    }
}
