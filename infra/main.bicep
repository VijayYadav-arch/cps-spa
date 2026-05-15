// infra/main.bicep
// Provisions Azure Static Web Apps resource and links it to the .NET Container App backend.
// Deploy: az deployment group create -g <rg> -f infra/main.bicep -p env=dev dotnetApiResourceId=<id>

param location string = resourceGroup().location

@allowed(['dev', 'staging', 'prod'])
param env string = 'dev'

// Full ARM resource ID of the .NET Container App, e.g.:
// /subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.App/containerApps/cps-dotnet
param dotnetApiResourceId string

resource swa 'Microsoft.Web/staticSites@2023-01-01' = {
  name: 'cps-spa-${env}'
  location: location
  sku: {
    name: env == 'prod' ? 'Standard' : 'Free'
    tier: env == 'prod' ? 'Standard' : 'Free'
  }
  properties: {}
}

resource swaBackend 'Microsoft.Web/staticSites/linkedBackends@2023-01-01' = {
  parent: swa
  name: 'dotnetApi'
  properties: {
    backendResourceId: dotnetApiResourceId
    region: location
  }
}

output swaDefaultHostname string = swa.properties.defaultHostname
output deploymentToken string = swa.listSecrets().properties.apiKey
