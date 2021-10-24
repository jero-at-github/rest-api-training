import 'mocha';
import { expect } from 'chai';
import request from 'supertest';
import Server from '../server';
import {
  ControllerHelper,
  Offers,
} from '../server/api/controllers/products/controller-helper';

const testData = {
  soupId: 1,
  breadId: 2,
  cheeseId: 3,
  milkId: 4,
  soupIndividualPrice: 199,
  breadIndividualPrice: 87,
  milkIndividualPrice: 67,
  milkCost: 61,
};

describe('Products', () => {
  it('should get all products', () =>
    request(Server)
      .get('/api/v1/products')
      .expect('Content-Type', /json/)
      .then((r) => {
        expect(r.body).to.be.an('array').of.length(4);
      }));

  it('should add a new product', () =>
    request(Server)
      .post('/api/v1/products')
      .send({ name: 'test', customerPrice: 123, cost: 456 })
      .expect('Content-Type', /json/)
      .then((r) => {
        expect(r.body)
          .to.be.an('object')
          .that.has.property('name')
          .equal('test');
        expect(r.body)
          .to.be.an('object')
          .that.has.property('customerPrice')
          .equal(123);
        expect(r.body).to.be.an('object').that.has.property('cost').equal(456);
      }));

  it('should get an product by id', () =>
    request(Server)
      .get('/api/v1/products/5')
      .expect('Content-Type', /json/)
      .then((r) => {
        console.log(r.body);
        expect(r.body)
          .to.be.an('object')
          .that.has.property('name')
          .equal('test');
        expect(r.body)
          .to.be.an('object')
          .that.has.property('customerPrice')
          .equal(123);
        expect(r.body).to.be.an('object').that.has.property('cost').equal(456);
      }));
});

describe('Batch products prices', () => {
  it('Should get regular prices for 10 pieces of bread', () => {
    const breadQuantity = 10;

    return request(Server)
      .get(
        `/api/v1/products/batch-price?item=${testData.breadId}-${breadQuantity}`
      )
      .expect('Content-Type', /json/)
      .then((r) => {
        console.log(r.body);

        expect(r.body)
          .to.be.an('object')
          .that.has.property('items')
          .length.have.length(1);

        const firstItem = r.body.items[0];
        expect(firstItem)
          .to.be.an('object')
          .that.has.property('totalPrice')
          .equal(
            `${ControllerHelper.toCurrencyFormat(
              breadQuantity * testData.breadIndividualPrice
            )}`
          );
        expect(firstItem)
          .that.has.property('offer')
          .that.has.property('isOfferApplied')
          .equal(false);
      });
  });

  it('Should get offer for 10 soups and 7 breads bought (Soup And Bread BOGOF)', () => {
    const breadQuantity = 7;
    const soupQuantity = 10;
    const numberOfFreeSoups = 3;

    return request(Server)
      .get(
        `/api/v1/products/batch-price?item=${testData.soupId}-${soupQuantity}&item=${testData.breadId}-${breadQuantity}`
      )
      .expect('Content-Type', /json/)
      .then((r) => {
        console.log(r.body);

        expect(r.body)
          .to.be.an('object')
          .that.has.property('items')
          .length.have.length(2);

        const soupItem = r.body.items[0];
        expect(soupItem)
          .to.be.an('object')
          .that.has.property('quantity')
          .equal(soupQuantity + numberOfFreeSoups);
        expect(soupItem)
          .that.has.property('offer')
          .that.has.property('isOfferApplied')
          .equal(true);
        expect(soupItem.offer)
          .that.has.property('offerApplied')
          .that.contains(ControllerHelper.getOfferName(Offers.SoupAndBread));
      });
  });

  it('Should get offer dairy delicious when buying cheese and milk', () => {
    const cheeseQuantity = 2;
    const milkQuantity = 10;

    return request(Server)
      .get(
        `/api/v1/products/batch-price?item=${testData.cheeseId}-${cheeseQuantity}&item=${testData.milkId}-${milkQuantity}`
      )
      .expect('Content-Type', /json/)
      .then((r) => {
        console.log(r.body);

        expect(r.body)
          .to.be.an('object')
          .that.has.property('items')
          .length.have.length(2);

        const milkItem = r.body.items[1];
        expect(milkItem)
          .to.be.an('object')
          .that.has.property('totalPrice')
          .equal(
            `${ControllerHelper.toCurrencyFormat(
              milkQuantity * testData.milkCost
            )}`
          );
        expect(milkItem)
          .that.has.property('offer')
          .that.has.property('isOfferApplied')
          .equal(true);
        expect(milkItem.offer)
          .that.has.property('offerApplied')
          .that.contains(ControllerHelper.getOfferName(Offers.DairyDelicious));
      });
  });

  it('Should get offer sunday soup sale when buying on Sunday', () => {
    const soupQuantity = 10;
    ControllerHelper.overwriteDayOfTheWeek = 0;

    return request(Server)
      .get(
        `/api/v1/products/batch-price?item=${testData.soupId}-${soupQuantity}`
      )
      .expect('Content-Type', /json/)
      .then((r) => {
        console.log(r.body);

        expect(r.body)
          .to.be.an('object')
          .that.has.property('items')
          .length.have.length(1);

        const soupItem = r.body.items[0];
        expect(soupItem)
          .to.be.an('object')
          .that.has.property('totalPrice')
          .equal(
            `${ControllerHelper.toCurrencyFormat(
              soupQuantity * testData.soupIndividualPrice -
                (soupQuantity * testData.soupIndividualPrice) / 10
            )}`
          );
        expect(soupItem)
          .that.has.property('offer')
          .that.has.property('isOfferApplied')
          .equal(true);
        expect(soupItem.offer)
          .that.has.property('offerApplied')
          .that.contains(ControllerHelper.getOfferName(Offers.SundaySoupSale));
      });
  });
});
