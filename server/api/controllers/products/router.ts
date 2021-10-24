import express from 'express';
import controller from './controller';
export default express
  .Router()
  .post('/', controller.create)
  .get('/', controller.all)
  .get('/batch-price', controller.calculateBatchPrice)
  .get('/:id', controller.byId);
