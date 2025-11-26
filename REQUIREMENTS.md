api_requirements:
This document defines all API endpoints, database schema, and data shapes
required for the Storefront Backend Project.

endpoints:
    users:
      index:
        route: /users
        method: GET
        auth: JWT required
        description: Get all users
      show:
        route: /users/{id}
        method: GET
        auth: JWT required
        description: Show a user and their 5 most recent purchases
      create:
        route: /users
        method: POST
        auth: public
        description: Create new user and return JWT
        body:
          first_name: string
          last_name: string
          password: string
      authenticate:
        route: /users/authenticate
        method: POST
        auth: public
        description: Authenticate user and return JWT
        body:
          first_name: string
          password: string

    products:
      index:
        route: /products
        method: GET
        auth: public
        description: List all products
      show:
        route: /products/{id}
        method: GET
        auth: public
        description: Show product details
      create:
        route: /products
        method: POST
        auth: JWT required
        description: Create a product
        body:
          name: string
          price: number
          category: string (optional)
      by_category:
        route: /products/category/{category}
        method: GET
        auth: public
        description: Get products by category
      top_products:
        route: /products/top
        method: GET
        auth: public
        description: Get top 5 most popular products

    orders:
      current:
        route: /orders/current/{user_id}
        method: GET
        auth: JWT required
        description: Get active order for a user
      completed:
        route: /orders/completed/{user_id}
        method: GET
        auth: JWT required
        description: Get completed orders for a user
      create:
        route: /orders
        method: POST
        auth: JWT required
        description: Create a new order
        body:
          status: active or complete
      add_product:
        route: /orders/{id}/products
        method: POST
        auth: JWT required
        description: Add product to order
        body:
          product_id: number
          quantity: number
      show:
        route: /orders/{id}
        method: GET
        auth: JWT required
        description: Show order and items

database_schema:
    users:
      id: SERIAL PRIMARY KEY
      first_name: VARCHAR(100)
      last_name: VARCHAR(100)
      password_digest: VARCHAR(255)
      created_at: timestamp
      updated_at: timestamp

    products:
      id: SERIAL PRIMARY KEY
      name: VARCHAR(255)
      price: NUMERIC(10,2)
      category: VARCHAR(100)
      created_at: timestamp
      updated_at: timestamp

    orders:
      id: SERIAL PRIMARY KEY
      user_id: INTEGER (FK users.id)
      status: active or complete
      created_at: timestamp
      updated_at: timestamp

    order_products:
      id: SERIAL PRIMARY KEY
      order_id: INTEGER (FK orders.id)
      product_id: INTEGER (FK products.id)
      quantity: INTEGER
      unique: (order_id, product_id)

  data_shapes:
    user:
      id: number
      first_name: string
      last_name: string
      password?: string
    product:
      id: number
      name: string
      price: number
      category?: string
    order:
      id: number
      user_id: number
      status: string
    order_product:
      id: number
      order_id: number
      product_id: number
      quantity: number
