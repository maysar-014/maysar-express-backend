output "auth_service_url" {
  description = "Auth service URL"
  value       = "https://auth.api.${var.domain_name}"
}

output "order_service_url" {
  description = "Order service URL"
  value       = "https://orders.api.${var.domain_name}"
}

output "payment_service_url" {
  description = "Payment service URL"
  value       = "https://payments.api.${var.domain_name}"
}

output "seller_service_url" {
  description = "Seller service URL"
  value       = "https://sellers.api.${var.domain_name}"
}

output "catalog_service_url" {
  description = "Catalog service URL"
  value       = "https://catalog.api.${var.domain_name}"
}

output "notification_service_url" {
  description = "Notification service URL"
  value       = "https://notifications.api.${var.domain_name}"
}

output "admin_service_url" {
  description = "Admin service URL"
  value       = "https://admin.api.${var.domain_name}"
}

output "analytics_service_url" {
  description = "Analytics service URL"
  value       = "https://analytics.api.${var.domain_name}"
}

output "cdn_service_url" {
  description = "CDN service URL"
  value       = "https://cdn.api.${var.domain_name}"
}

# Helm release names for reference
output "auth_service_release" {
  description = "Auth service Helm release name"
  value       = helm_release.auth_service.name
}

output "order_service_release" {
  description = "Order service Helm release name"
  value       = helm_release.order_service.name
}

output "payment_service_release" {
  description = "Payment service Helm release name"
  value       = helm_release.payment_service.name
}

output "seller_service_release" {
  description = "Seller service Helm release name"
  value       = helm_release.seller_service.name
}

output "catalog_service_release" {
  description = "Catalog service Helm release name"
  value       = helm_release.catalog_service.name
}

output "notification_service_release" {
  description = "Notification service Helm release name"
  value       = helm_release.notification_service.name
}

output "admin_service_release" {
  description = "Admin service Helm release name"
  value       = helm_release.admin_service.name
}

output "analytics_service_release" {
  description = "Analytics service Helm release name"
  value       = helm_release.analytics_service.name
}

output "cdn_service_release" {
  description = "CDN service Helm release name"
  value       = helm_release.cdn_service.name
}
