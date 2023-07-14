node('codebuild-velocity-plugins') {
    @Library('DeploymentRiskAnalysis') _
    def pipeline = new com.urbancode.VelocityServicePipeline()
    pipeline.execute( 
        repoName: 'ucv-ext-ewm', 
        componentName: 'ucv-ext-ewm', 
        publishBranchName: 'master', 
        buildTarget: 'npm-and-docker', 
        isPlugin:true )
}
