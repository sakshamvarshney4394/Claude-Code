// Product catalog — single source of truth for products and their categories.
// Both the Category sections and the Product checkboxes are derived from this,
// so a product is always connected to its respective category.

export interface CatalogCategory {
  category: string
  products: string[]
}

export const PRODUCT_CATALOG: CatalogCategory[] = [
  {
    category: 'Indian Chutney',
    products: ['KMC', 'DPC', 'Date and Tamarind', 'Saunth Chutney'],
  },
  {
    category: 'Mayonnaise',
    products: [
      'Premium Burger Mayo',
      'Cheesy Spread',
      'Cheese Blend',
      'Creamy Blend',
    ],
  },
  {
    category: 'Hot Sauces',
    products: [
      'Pizza Pasta Sauce',
      'Momo Chutney',
      'Chilli Garlic Chutney',
    ],
  },
  {
    category: 'Tomato Products',
    products: [
      'Tomato Ketchup 8g Pouch',
      'Tomato Ketchup 1kg',
      'Tomato Sauce 8g',
      'Tomato Sauce 1.2kg',
    ],
  },
]

// Flat list of categories
export const CATEGORIES: string[] = PRODUCT_CATALOG.map(c => c.category)

// Look up the category a product belongs to
export const getCategoryForProduct = (product: string): string | undefined =>
  PRODUCT_CATALOG.find(c => c.products.includes(product))?.category
