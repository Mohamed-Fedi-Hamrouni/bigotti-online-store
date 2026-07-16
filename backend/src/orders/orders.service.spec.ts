import { BadRequestException } from '@nestjs/common';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

import { OrdersService } from './orders.service';

const variant = {
  id: 'variant-1',
  productId: 'product-1',
  color: 'Noir',
  size: 'M',
  stockQuantity: 5,
  product: {
    id: 'product-1',
    name: 'Chemise',
    reference: 'CHEM-1',
    price: 100,
    status: 'PUBLISHED',
    isOnSale: false,
    discountType: null,
    discountValue: null,
    discountStartDate: null,
    discountEndDate: null,
    saleCampaign: null,
    collection: null,
  },
};

const createDto = (items = [{ variantId: 'variant-1', quantity: 2 }]) => ({
  customerName: 'Client Test',
  customerPhone: '20123456',
  deliveryAddress: 'Adresse réelle de test',
  deliveryCity: 'Tunis',
  paymentMethod: 'CASH_ON_DELIVERY' as const,
  items,
});

function createService(options?: {
  stockUpdateCounts?: number[];
  restorationUpdateCounts?: number[];
  statusUpdateCounts?: number[];
  orderStatus?: string;
  concurrentOrderStatus?: string;
  orderItems?: Array<{ variantId: string | null; quantity: number }>;
  failStockRestore?: boolean;
}) {
  const stockUpdateCounts = [...(options?.stockUpdateCounts ?? [1])];
  const restorationUpdateCounts = [
    ...(options?.restorationUpdateCounts ?? [1]),
  ];
  const statusUpdateCounts = [...(options?.statusUpdateCounts ?? [1])];
  let currentOrderStatus = options?.orderStatus ?? 'PENDING';
  const order = {
    id: 'order-1',
    orderNumber: 'BG-0001',
    orderStatus: currentOrderStatus,
    items: options?.orderItems ?? [{ variantId: 'variant-1', quantity: 2 }],
    payment: { id: 'payment-1' },
  };
  const tx = {
    productVariant: {
      updateMany: jest.fn().mockImplementation((args) => {
        if (args.data.stockQuantity?.increment && options?.failStockRestore) {
          throw new Error('échec de restauration');
        }
        const counts = args.data.stockQuantity?.increment
          ? restorationUpdateCounts
          : stockUpdateCounts;
        return Promise.resolve({ count: counts.shift() ?? 1 });
      }),
    },
    order: {
      create: jest.fn().mockResolvedValue(order),
      findUnique: jest.fn().mockResolvedValue(order),
      findUniqueOrThrow: jest.fn().mockImplementation(() =>
        Promise.resolve({
          ...order,
          orderStatus: currentOrderStatus,
        }),
      ),
      update: jest.fn().mockResolvedValue(order),
      updateMany: jest.fn().mockImplementation((args) => {
        const count = statusUpdateCounts.shift() ?? 1;
        currentOrderStatus =
          count === 1
            ? args.data.orderStatus
            : (options?.concurrentOrderStatus ?? currentOrderStatus);
        return Promise.resolve({ count });
      }),
    },
  };
  const prisma = {
    productVariant: {
      findMany: jest.fn().mockResolvedValue([variant]),
    },
    order: {
      count: jest.fn().mockResolvedValue(0),
    },
    customer: { findUnique: jest.fn() },
    $transaction: jest
      .fn()
      .mockImplementation(async (callback) => callback(tx)),
  };
  const jwt = { verify: jest.fn() };

  return {
    service: new OrdersService(prisma as never, jwt as never),
    prisma,
    tx,
  };
}

describe('OrdersService - intégrité du stock', () => {
  it('décrémente le stock et crée toutes les données de commande', async () => {
    const { service, tx } = createService();

    await service.create(createDto());

    expect(tx.productVariant.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'variant-1', stockQuantity: { gte: 2 } },
        data: { stockQuantity: { decrement: 2 } },
      }),
    );
    expect(tx.order.create).toHaveBeenCalledTimes(1);
    expect(tx.order.create.mock.calls[0][0].data.payment.create).toEqual(
      expect.objectContaining({ amount: 208 }),
    );
  });

  it('refuse un stock insuffisant avant la transaction', async () => {
    const { service, prisma } = createService();
    prisma.productVariant.findMany.mockResolvedValue([
      { ...variant, stockQuantity: 1 },
    ]);

    await expect(service.create(createDto())).rejects.toThrow(
      'Stock insuffisant pour Chemise - Noir / M.',
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('ne crée aucune donnée si la décrémentation conditionnelle échoue', async () => {
    const { service, tx } = createService({ stockUpdateCounts: [0] });

    await expect(service.create(createDto())).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(tx.order.create).not.toHaveBeenCalled();
  });

  it('agrège les variantes dupliquées pour le stock, les totaux et la sauvegarde', async () => {
    const { service, tx } = createService();

    await service.create(
      createDto([
        { variantId: 'variant-1', quantity: 2 },
        { variantId: 'variant-1', quantity: 3 },
      ]),
    );

    expect(tx.productVariant.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.productVariant.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'variant-1', stockQuantity: { gte: 5 } },
      }),
    );
    const data = tx.order.create.mock.calls[0][0].data;
    expect(data.items.create).toHaveLength(1);
    expect(data.items.create[0].quantity).toBe(5);
    expect(data.subtotal).toBe(500);
  });

  it('gère un échec conditionnel simulant un achat concurrent', async () => {
    const { service, tx } = createService({ stockUpdateCounts: [0] });

    await expect(service.create(createDto())).rejects.toThrow(
      'Stock insuffisant pour Chemise - Noir / M.',
    );
    expect(tx.order.create).not.toHaveBeenCalled();
  });

  it('restaure le stock lors de l’annulation', async () => {
    const { service, tx } = createService();

    await service.updateStatus('order-1', { orderStatus: 'CANCELLED' });

    expect(tx.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { orderStatus: 'CANCELLED' } }),
    );
    expect(tx.productVariant.updateMany).toHaveBeenCalledWith({
      where: { id: 'variant-1' },
      data: { stockQuantity: { increment: 2 } },
    });
  });

  it('utilise un compare-and-set pour une transition non annulée', async () => {
    const { service, tx } = createService({ orderStatus: 'CONFIRMED' });

    await service.updateStatus('order-1', { orderStatus: 'SHIPPED' });

    expect(tx.order.update).not.toHaveBeenCalled();
    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'order-1', orderStatus: 'CONFIRMED' },
      data: { orderStatus: 'SHIPPED' },
    });
    expect(tx.productVariant.updateMany).not.toHaveBeenCalled();
  });

  it('empêche une transition SHIPPED concurrente de rouvrir une commande annulée', async () => {
    const { service, tx } = createService({
      statusUpdateCounts: [0],
      concurrentOrderStatus: 'CANCELLED',
    });

    await expect(
      service.updateStatus('order-1', { orderStatus: 'SHIPPED' }),
    ).rejects.toThrow('Une commande annulée ne peut pas être réactivée.');
    expect(tx.productVariant.updateMany).not.toHaveBeenCalled();
  });

  it('laisse un état cohérent si DELIVERED gagne contre une annulation', async () => {
    const { service, tx } = createService({
      statusUpdateCounts: [0],
      concurrentOrderStatus: 'DELIVERED',
    });

    await expect(
      service.updateStatus('order-1', { orderStatus: 'CANCELLED' }),
    ).rejects.toThrow('Une commande livrée ne peut pas être annulée.');
    expect(tx.productVariant.updateMany).not.toHaveBeenCalled();
  });

  it('retourne l’erreur concurrente française pour un autre changement de statut', async () => {
    const { service, tx } = createService({
      statusUpdateCounts: [0],
      concurrentOrderStatus: 'PREPARING',
    });

    await expect(
      service.updateStatus('order-1', { orderStatus: 'SHIPPED' }),
    ).rejects.toThrow('Le statut de la commande a changé. Veuillez réessayer.');
    expect(tx.productVariant.updateMany).not.toHaveBeenCalled();
  });

  it('n’annule pas si une ligne à restaurer a perdu sa variante', async () => {
    const { service, tx } = createService({
      orderItems: [{ variantId: null, quantity: 2 }],
    });

    await expect(
      service.updateStatus('order-1', { orderStatus: 'CANCELLED' }),
    ).rejects.toThrow('La restauration du stock de la commande a échoué.');
    expect(tx.order.updateMany).not.toHaveBeenCalled();
    expect(tx.productVariant.updateMany).not.toHaveBeenCalled();
  });

  it('fait échouer la transaction si une variante ne peut pas être restaurée', async () => {
    const { service, prisma, tx } = createService({
      restorationUpdateCounts: [0],
    });

    await expect(
      service.updateStatus('order-1', { orderStatus: 'CANCELLED' }),
    ).rejects.toThrow('La restauration du stock de la commande a échoué.');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.order.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.productVariant.updateMany).toHaveBeenCalledTimes(1);
  });

  it('une seconde annulation concurrente ne restaure pas le stock', async () => {
    const { service, tx } = createService({
      statusUpdateCounts: [0],
      concurrentOrderStatus: 'CANCELLED',
    });

    await service.updateStatus('order-1', { orderStatus: 'CANCELLED' });

    expect(tx.productVariant.updateMany).not.toHaveBeenCalled();
  });

  it('ne restaure pas le stock lors d’une annulation répétée', async () => {
    const { service, tx } = createService({ orderStatus: 'CANCELLED' });

    await service.updateStatus('order-1', { orderStatus: 'CANCELLED' });

    expect(tx.order.updateMany).not.toHaveBeenCalled();
    expect(tx.productVariant.updateMany).not.toHaveBeenCalled();
  });

  it('interdit de réactiver une commande annulée', async () => {
    const { service } = createService({ orderStatus: 'CANCELLED' });

    await expect(
      service.updateStatus('order-1', { orderStatus: 'CONFIRMED' }),
    ).rejects.toThrow('Une commande annulée ne peut pas être réactivée.');
  });

  it('interdit d’annuler une commande livrée', async () => {
    const { service } = createService({ orderStatus: 'DELIVERED' });

    await expect(
      service.updateStatus('order-1', { orderStatus: 'CANCELLED' }),
    ).rejects.toThrow('Une commande livrée ne peut pas être annulée.');
  });

  it('garde statut et stock dans une seule transaction si la restauration échoue', async () => {
    const { service, prisma, tx } = createService({ failStockRestore: true });

    await expect(
      service.updateStatus('order-1', { orderStatus: 'CANCELLED' }),
    ).rejects.toThrow('échec de restauration');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.order.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.productVariant.updateMany).toHaveBeenCalledTimes(1);
  });
});
