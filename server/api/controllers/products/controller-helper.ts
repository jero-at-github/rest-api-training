import { Product } from '../../services/products.service';

export enum Offers {
  'SoupAndBread',
  'SundaySoupSale',
  'DairyDelicious',
}

interface BatchItem {
  name: string;
  quantity: number;
  individualPrice: number | string;
  offer: {
    isOfferApplied: boolean;
    offerApplied?: string[];
    totalPriceBeforeOfferApplied?: number | string;
  };
  totalPrice: number | string;
}

export interface BatchResponse {
  items: BatchItem[];
  grandTotal: number | string;
  grandTotalBeforeOffersApplied?: number | string;
}

interface OfferCalculation {
  appliedOffers: Offers[];
  soupAndBreadMatches: number;
}

interface Items {
  [id: number]: number;
}

export class ControllerHelper {
  static overwriteDayOfTheWeek = null; // used for testing mockup

  static toCurrencyFormat(cost: number): string {
    if (cost == null) {
      return;
    }
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    });

    return formatter.format(cost);
  }

  static isProductSoup(id: number): boolean {
    return id === 1;
  }
  static isProductBread(id: number): boolean {
    return id === 2;
  }
  static isProductCheese(id: number): boolean {
    return id === 3;
  }
  static isProductMilk(id: number): boolean {
    return id === 4;
  }
  static isTodaySunday(): boolean {
    const currentDay = this.overwriteDayOfTheWeek
      ? this.overwriteDayOfTheWeek
      : 0;
    return new Date().getDay() === currentDay;
  }
  static getOfferName(offer: Offers): string {
    const names = ['Soup and bread', 'Sunday soup sale', 'Dairy delicious'];
    return names[offer];
  }

  static validateAndParseItems(itemsQuery: Array<string>): Items {
    const items: Items = {};

    // Validate that the query values are separated by one dash char
    const itemsQueryContainSeparator = itemsQuery.every(
      (ip) => (ip.match(/-/g) || []).length === 1
    );
    if (!itemsQueryContainSeparator) {
      throw { status: 400, message: 'Input query values malformed.' };
    }

    for (const itemQuery of itemsQuery) {
      const id = Number.parseInt(itemQuery.split('-')[0]);
      const quantity = Number.parseInt(itemQuery.split('-')[1]);
      // Validate that the query values contain numbers
      if (isNaN(id) || isNaN(quantity)) {
        throw { status: 400, message: 'Input query values malformed.' };
      }
      if (!items[id]) items[id] = 0;
      items[id] += quantity;
    }

    return items;
  }

  static calculateOffers(items: Items): OfferCalculation {
    const appliedOffers: Offers[] = [];
    let numberOfSoups = 0;
    let numberOfBreads = 0;
    let soupAndBreadMatches = 0;
    let numberOfCheese = 0;

    Object.keys(items).forEach((id) => {
      const quantity = Number.parseInt(items[id]);
      if (this.isProductSoup(Number.parseInt(id))) numberOfSoups += quantity;
      if (this.isProductBread(Number.parseInt(id))) numberOfBreads += quantity;
      if (this.isProductCheese(Number.parseInt(id))) numberOfCheese += quantity;
    });

    if (numberOfSoups > 0 && numberOfBreads > 0) {
      appliedOffers.push(Offers.SoupAndBread);
      soupAndBreadMatches =
        numberOfSoups > numberOfBreads ? numberOfBreads : numberOfSoups;
      soupAndBreadMatches = soupAndBreadMatches > 3 ? 3 : soupAndBreadMatches;
    }
    if (numberOfSoups > 0 && this.isTodaySunday()) {
      appliedOffers.push(Offers.SundaySoupSale);
    }
    if (!appliedOffers.includes(Offers.SundaySoupSale) && numberOfCheese > 0) {
      appliedOffers.push(Offers.DairyDelicious);
    }

    return { appliedOffers, soupAndBreadMatches };
  }

  static applyOffers(
    itemResponse: BatchItem,
    product: Product,
    offerCalculation: OfferCalculation
  ): void {
    if (offerCalculation.appliedOffers.length > 0) {
      // Sunday soup sale
      if (
        this.isProductSoup(product.id) &&
        offerCalculation.appliedOffers.includes(Offers.SundaySoupSale)
      ) {
        itemResponse.offer.isOfferApplied = true;
        itemResponse.offer.offerApplied.push(
          this.getOfferName(Offers.SundaySoupSale)
        );
        itemResponse.offer.totalPriceBeforeOfferApplied =
          itemResponse.totalPrice;
        itemResponse.totalPrice =
          (itemResponse.totalPrice as number) -
          (itemResponse.totalPrice as number) / 10;
      } // Dairy delicious
      else if (
        this.isProductMilk(product.id) &&
        offerCalculation.appliedOffers.includes(Offers.DairyDelicious) &&
        !offerCalculation.appliedOffers.includes(Offers.SundaySoupSale)
      ) {
        itemResponse.offer.isOfferApplied = true;
        itemResponse.offer.offerApplied.push(
          this.getOfferName(Offers.DairyDelicious)
        );
        itemResponse.offer.totalPriceBeforeOfferApplied =
          itemResponse.totalPrice;
        itemResponse.totalPrice = product.cost * itemResponse.quantity;
      }

      // Soup and bread
      if (
        this.isProductSoup(product.id) &&
        offerCalculation.appliedOffers.includes(Offers.SoupAndBread)
      ) {
        itemResponse.offer.isOfferApplied = true;
        itemResponse.quantity += offerCalculation.soupAndBreadMatches;
        itemResponse.offer.offerApplied.push(
          this.getOfferName(Offers.SoupAndBread)
        );
        if (!offerCalculation.appliedOffers.includes(Offers.SundaySoupSale)) {
          itemResponse.offer.totalPriceBeforeOfferApplied =
            itemResponse.totalPrice;
        }
      }
    }

    if (itemResponse.offer.totalPriceBeforeOfferApplied === null) {
      itemResponse.offer.totalPriceBeforeOfferApplied = itemResponse.totalPrice;
    }
  }

  static calculateItemsResponse(
    response: BatchResponse,
    products: Product[],
    items: Items,
    offerCalculation
  ): void {
    for (const product of products) {
      if (typeof product !== 'undefined') {
        const itemResponse: BatchItem = {
          name: null,
          quantity: null,
          individualPrice: null,
          totalPrice: null,
          offer: {
            isOfferApplied: false,
            offerApplied: [],
            totalPriceBeforeOfferApplied: null,
          },
        };

        // Calculate response data previous to possible offers
        const productQuantity = items[product.id];
        const individualPrice = product.customerPrice;
        const totalPrice = individualPrice * productQuantity;

        itemResponse.name = product.name;
        itemResponse.quantity = productQuantity;
        itemResponse.individualPrice = individualPrice;
        itemResponse.totalPrice = totalPrice;

        // Apply possible offers
        this.applyOffers(itemResponse, product, offerCalculation);

        response.items.push(itemResponse);
      }
    }
  }

  static applyCurrencyFormat(response: BatchResponse): void {
    for (const item of response.items) {
      item.totalPrice = this.toCurrencyFormat(item.totalPrice as number);
      item.individualPrice = this.toCurrencyFormat(
        item.individualPrice as number
      );
      item.offer.totalPriceBeforeOfferApplied = this.toCurrencyFormat(
        item.offer.totalPriceBeforeOfferApplied as number
      );
    }
    response.grandTotal = this.toCurrencyFormat(response.grandTotal as number);
    response.grandTotalBeforeOffersApplied = this.toCurrencyFormat(
      response.grandTotalBeforeOffersApplied as number
    );
  }

  static calculateGrandTotals(response: BatchResponse): void {
    response.grandTotalBeforeOffersApplied = response.items
      .map((i) => i.offer.totalPriceBeforeOfferApplied)
      .reduce(
        (
          prevTotalPriceBeforeOfferApplied,
          currentTotalPriceBeforeOfferApplied
        ) =>
          (prevTotalPriceBeforeOfferApplied as number) +
          (currentTotalPriceBeforeOfferApplied as number)
      );

    response.grandTotal = response.items
      .map((i) => i.totalPrice)
      .reduce(
        (prevTotalPrice, currentTotalPrice) =>
          (prevTotalPrice as number) + (currentTotalPrice as number)
      );
  }
}
