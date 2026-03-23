import type {
  AppUser,
  Customer,
  CustomerSummary,
  Lead,
  LeadSummary,
  Product,
  ProductSummary,
  UserSummary,
} from '../../types/domain';

export function toUserSummary(user: AppUser): UserSummary {
  return {
    id: user.id,
    fullName: user.fullName,
    role: user.role,
    avatarUrl: user.avatarUrl,
  };
}

export function toLeadSummary(lead: Lead): LeadSummary {
  return {
    id: lead.id,
    fullName: lead.fullName,
    status: lead.status,
    phone: lead.contact.phone,
    username: lead.username,
  };
}

export function toCustomerSummary(customer: Customer): CustomerSummary {
  return {
    id: customer.id,
    fullName: customer.fullName,
    phone: customer.contact.phone,
    username: customer.username,
  };
}

export function toProductSummary(product: Product): ProductSummary {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    price: product.price,
    currency: product.currency,
    imageUrl: product.imageUrl,
  };
}
