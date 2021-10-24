import ProductsService, { Product } from '../../services/products.service';
import { Request, Response } from 'express';
import { BatchResponse, ControllerHelper } from './controller-helper';

export class Controller {
  all(req: Request, res: Response): void {
    ProductsService.all().then((r) => res.json(r));
  }

  byId(req: Request, res: Response): void {
    const id = Number.parseInt(req.params['id']);
    ProductsService.byId(id).then((r) => {
      if (r) res.json(r);
      else res.status(404).send();
    });
  }

  calculateBatchPrice(req: Request, res: Response): Response | void {
    const allProductsPromises: Promise<Product>[] = [];
    const response: BatchResponse = {
      items: [],
      grandTotalBeforeOffersApplied: null,
      grandTotal: null,
    };

    // Validate and parse query values
    const items = ControllerHelper.validateAndParseItems(
      req.query['item'] as Array<string>
    );

    // Request the products and calculate the response
    Object.keys(items).forEach((id) => {
      allProductsPromises.push(ProductsService.byId(Number.parseInt(id)));
    });
    Promise.all(allProductsPromises).then((products: Product[]) => {
      const offerCalculation = ControllerHelper.calculateOffers(items);
      ControllerHelper.calculateItemsResponse(
        response,
        products,
        items,
        offerCalculation
      );
      ControllerHelper.calculateGrandTotals(response);
      ControllerHelper.applyCurrencyFormat(response);

      return res.status(200).json(response);
    });
  }

  create(req: Request, res: Response): void {
    const { name, customerPrice, cost } = req.body;
    ProductsService.create(name, customerPrice, cost).then((r) =>
      res.status(201).location(`/api/v1/product/${r.id}`).json(r)
    );
  }
}
export default new Controller();
