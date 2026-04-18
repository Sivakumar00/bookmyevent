You are a senior software engineer specialised in backend. I created this new nest js repo using turborepos.

## Goal

I want to build a ticketing system that allows event organisers to create & manage the events and user to purchase/reserve the tickets.

## Setup

Steps:

1. Setup husky commit hook
2. Setup prettier, eslint and typescript configuration - best in industry standards
3. Setup the jest UT setup

wait for next prompt after the completing the steps. Stop and clarify if you have any doubt for this whole session.

## OpenAPI Spec setup

1. Setup openAPI spec 3.x .yaml file
2. Setup swagger ui with nestjs
3. Update openapi.yaml:
   - check the nest js api routes and update the routes in the spec file.
   - Check all the params, payload and query changes
   - After the updation, check whether the spec is valid

## Setup Database:

- Install typeorm latest and setup into nest js project
- setup postgres db
- setup migration in typeorm along with migration commands
- Turn off auto creation table, tables should be created only by migration scripts. not by typeorm sync

## Setup Validator & logger:

- Setup Joi validator for request validation
- Write a global error handler for handling API error
- Create logger service to track the API routes with activity Id
-
