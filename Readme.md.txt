project:
  name: Storefront Backend API
  description: >
    A TypeScript, Node.js, and PostgreSQL backend for an online storefront.
    Includes authentication, secure password hashing, migrations, RESTful routes,
    and full Jasmine test suites.

setup_instructions:
  prerequisites:
    - Node.js >= 14
    - PostgreSQL >= 12
    - Yarn or npm
    - db-migrate (installed locally)

  installation:
    - command: yarn install
      description: Install project dependencies

  database_setup:
    postgres_password_change:
      description: Change the default postgres password
      command: >
        ALTER USER postgres WITH PASSWORD 'your_pass';

    create_databases:
      instructions:
        - Run: psql -U postgres
        - Execute:
          - CREATE DATABASE store_front;
          - CREATE DATABASE store_front_test;

    environment_variables:
      create_file: .env
      content:
        POSTGRES_HOST: 127.0.0.1
        POSTGRES_DB: store_front
        POSTGRES_DB_TEST: store_front_test
        POSTGRES_USER: postgres
        POSTGRES_PASSWORD: your_pass
        BCRYPT_PASSWORD: myBcryptSecret
        SALT_ROUNDS: "10"
        TOKEN_SECRET: tokensecret

    run_migrations:
      command: db-migrate up
      description: Create all required tables in store_front

  running_the_server:
    dev_mode:
      command: yarn watch
      url: http://localhost:3000
    prod_mode:
      command: yarn start

  testing:
    description: Run Jasmine test suites
    command: yarn test

api_overview:
  users:
    endpoints:
      - GET /users
      - GET /users/{id}
      - POST /users
      - POST /users/authenticate

  products:
    endpoints:
      - GET /products
      - GET /products/{id}
      - POST /products
      - GET /products/category/{category}
      - GET /products/top

  orders:
    endpoints:
      - POST /orders
      - GET /orders/current/{user_id}
      - GET /orders/completed/{user_id}
      - POST /orders/{id}/products
      - GET /orders/{id}

notes:
  catch_any_explanation: >
    TypeScript treats thrown errors as `unknown`. We use `err: any` only inside
    catch blocks to safely access `err.message`. This is the ONLY valid use of `any`
    in this project.

  enhancements:
    - Recent purchases added to GET /users/{id}
    - Top 5 popular products implemented at GET /products/top
