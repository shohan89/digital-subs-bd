export const ROUTES = {
  home: "/",
  shop: "/shop",
  cart: "/cart",
  checkout: "/checkout",
  checkoutConfirmation: (orderId: string) => `/checkout/confirmation/${orderId}`,
  orderTracking: "/order-tracking",
  /** @deprecated Redirects to `shop` (see `next.config.ts`) — kept only as a redirect source, not a link target. */
  products: "/products",
  product: (slug: string) => `/products/${slug}`,
  categories: "/categories",
  category: (categorySlug: string) => `/category/${categorySlug}`,
  /** Deep link into the full filterable/sortable/paginated shop, pre-filtered — used from the category landing page's "View all in Shop" CTA, not as the primary category link (that's `category(slug)`). */
  productsByCategory: (categorySlug: string) => `/shop?category=${categorySlug}`,

  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  /** Signed in but wrong role (customer hitting `/admin/*`, manager hitting an admin-only page). */
  forbidden: "/forbidden",
  /** Not signed in at all — normal page navigation never lands here (`requireUser()`/middleware
   * redirect straight to `/login` per the app's own rule instead); kept for completeness and any
   * future non-page caller (e.g. an API route) that can't itself redirect. */
  unauthorized: "/unauthorized",

  dashboard: "/dashboard",
  dashboardOrders: "/dashboard/orders",
  dashboardSubscriptions: "/dashboard/subscriptions",
  dashboardNotifications: "/dashboard/notifications",
  dashboardProfile: "/dashboard/profile",
  dashboardSettings: "/dashboard/settings",

  admin: "/admin",
  adminDashboard: "/admin/dashboard",
  adminProducts: "/admin/products",
  adminProductNew: "/admin/products/new",
  adminProductEdit: (productId: string) => `/admin/products/${productId}/edit`,
  adminCategories: "/admin/categories",
  adminOrders: "/admin/orders",
  adminOrderDetail: (orderId: string) => `/admin/orders/${orderId}`,
  adminPayments: "/admin/payments",
  adminCustomers: "/admin/customers",
  adminCustomerDetail: (customerId: string) => `/admin/customers/${customerId}`,
  adminSubscriptions: "/admin/subscriptions",
  adminSubscriptionDetail: (subscriptionId: string) => `/admin/subscriptions/${subscriptionId}`,
  adminReviews: "/admin/reviews",
  /** Admin-only, not staff — see `requireAdmin()`. */
  adminCoupons: "/admin/coupons",
  /** Admin-only, not staff — see `requireAdmin()`. */
  adminSettings: "/admin/settings",
} as const;

export const PUBLIC_ROUTES = [
  ROUTES.home,
  ROUTES.shop,
  ROUTES.categories,
  ROUTES.orderTracking,
  ROUTES.login,
  ROUTES.register,
  ROUTES.forgotPassword,
];

export const AUTH_ROUTES = [ROUTES.login, ROUTES.register, ROUTES.forgotPassword];
