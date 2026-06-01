# A saved Resource Group so every rabbitrole-${env} resource shows up in one
# place in the console (Resource Groups & Tag Editor), keyed off the Project/Env
# tags the provider's default_tags stamp on everything. Pure convenience — it
# groups existing resources, it doesn't create or own them.
resource "aws_resourcegroups_group" "env" {
  name        = local.name # rabbitrole-dev / rabbitrole-prod
  description = "All ${var.env} resources for the rabbitrole project."

  resource_query {
    query = jsonencode({
      ResourceTypeFilters = ["AWS::AllSupported"]
      TagFilters = [
        { Key = "Project", Values = ["rabbitrole"] },
        { Key = "Env", Values = [var.env] },
      ]
    })
  }

  tags = local.tags
}
