## Introduction
In this section I would like to explain some personal decisions I took when implementing the challenge:
- For the new endpoint I decided to go for a **query approach** instead a body request since strictly speaking a 
GET method should contain the necessary data in the URL, being body requests reserved for other methods like POST, PUT, PATCH...
- I assumed that the user would know in advance the id of the product, setting as format for the parameter value 2 numbers
separated by a dash, being the first number the id of the product and the second number the quantity. 
- I decided as well to go for a multi parameter (same parameter name can be repeated N times) approach to represent the array in the URL. 
E.g: We want to send 10 pieces of bread (id = 2) and 2 pieces of cheese (id = 3), the request in this case would look like:
`localhost:3000/api/v1/products/batch-price?item=2-10&item=3-2`
- If you repeat the same product id several times they will be aggregated. E.g. a request like `localhost:3000/api/v1/products/batch-price?item=2-10&item=2-2`
will have the same effect as requesting the productId 2 with a quantity of 12. 
- I decided to encapsulate the offer information into an attribute in the response: `offer`. The `grandTotalBeforeOffersApplied`
and `totalPriceBeforeOfferApplied` attributes will be calculated in any case independently if offers are applied or not, 
being in that case the same amount as corresponding total attributes.
- I decided to put as much business logic into a helper class (`controller-helper.ts`) to avoid noise in the controller.
- For personal time constraints I can't implement all possible cases I would like in the test, therefore I just include some representative ones.

## Notes for the reviewer
- The library express-openapi-validator version 3.12.9 doesn't work properly with the latest Node.js version (16), 
either we need upgrade the library or use a lower version of Node.js <= 14.
- I assumed that I don't need to add the content schemas for responses in the Swagger definition since none is defined and
the environment variable OPENAPI_ENABLE_RESPONSE_VALIDATION is not set, disabling this the response validations.
- I assumed that the sunday soup sale offer applies a 10% in each soup you buy, excluding the extra received by the 
_Soup And Bread BOGOF offer.
