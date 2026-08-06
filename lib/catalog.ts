// Product catalog — single source of truth for products and their categories.
// Both the Category dropdown and the Product dropdown are derived from this,
// so a product is always connected to its respective category.

export interface CatalogCategory {
  category: string
  products: string[]
}

export const PRODUCT_CATALOG: CatalogCategory[] = [
  {
    category: 'Indian Chutneys',
    products: [
      'Tamarind Chutney',
      'Saunth Chutney (Khatti Meethi Chutney)',
      'Dhaniya Pudina Chutney',
      'Date & Tamarind Chutney',
      'Bhelpuri Chutney',
      'Samosa Chutney',
      'Delhi Ki Chaat Chutney',
      'Coriander Chutney',
      'Mint Chutney',
      'Garlic Chutney',
      'Tamarind Sauce',
    ],
  },
  {
    category: 'Mango Chutneys',
    products: [
      'Hot Mango Chutney',
      'Mango Lime Chutney',
      'Mango Chilli Chutney',
      'Mango Ginger Chutney',
      'Mango Sweet & Tangy Chutney',
    ],
  },
  {
    category: 'Chinese Sauces',
    products: [
      'Sweet Chilli Sauce',
      'Honey Chilli Sauce',
      'Green Chilli Sauce',
      'Chilli Garlic Sauce',
      'Red Chilli Sauce',
      'Soya Sauce',
      'Vinegar',
    ],
  },
  {
    category: 'Schezwan Range',
    products: ['Schezwan Sauce', 'Hot Schezwan Sauce', 'Schezwan Chutney'],
  },
  {
    category: 'Momo Range',
    products: ['Momo Sauce', 'Momo Chutney'],
  },
  {
    category: 'Hot Sauces',
    products: [
      'Hot Green Jalapeño Sauce',
      'Hot Garlic Jalapeño Sauce',
      'Hot Onion Jalapeño Sauce',
      'Mango Ghost Pepper Hot Sauce',
      'Hot Peaches Sauce',
      'Pineapple Green Chilli Sauce',
    ],
  },
  {
    category: 'Pizza & Pasta Sauces',
    products: [
      'Italian Pizza Sauce',
      'Pizza Pasta Sauce',
      'Pizza Pasta Herb Sauce',
      'Hot Pizza Pasta Sauce',
    ],
  },
  {
    category: 'Tomato Products',
    products: [
      'Tomato Ketchup',
      'Tomato Sauce',
      'Snack Dressing',
      'Tomato Paste',
      'Tomato Puree',
      'Tomato Soup',
    ],
  },
  {
    category: 'Ready-to-Use Gravies',
    products: [
      'Tomato Makhani Gravy',
      'White Gravy',
      'Yellow Gravy',
      'Brown Gravy',
      'Onion Tomato Gravy',
      'Bhuna Masala',
    ],
  },
  {
    category: 'Marinades',
    products: ['Tandoori Marinade', 'Reshmi Kebab Marinade', 'Kalami Kebab Marinade'],
  },
  {
    category: 'Mayonnaise',
    products: [
      'Mayonnaise',
      'Jalapeño Mayonnaise',
      'Piri Piri Mayonnaise',
      'Makhani Gravy Mayo',
    ],
  },
  {
    category: 'Dressings',
    products: [
      'Thousand Island Dressing',
      'Harissa Chilli Cumin Dressing',
      'Chipotle Dressing',
    ],
  },
  {
    category: 'Cheese Blends / Spreads',
    products: ['Cheese Blend', 'Chilli Cheese Blend'],
  },
  {
    category: 'Tamarind Products',
    products: [
      'Tamarind Slab (100% Seedless)',
      'Soft Tamarind (100% Seedless)',
      'Tamarind Paste',
    ],
  },
]

// Flat list of categories (used by the Category dropdown)
export const CATEGORIES: string[] = PRODUCT_CATALOG.map(c => c.category)

// Look up the category a product belongs to
export const getCategoryForProduct = (product: string): string | undefined =>
  PRODUCT_CATALOG.find(c => c.products.includes(product))?.category