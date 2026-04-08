import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { FiTrash2 } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { FilterSelect, Switch } from '../../../components/shared/data';
import AppIcon from '../../../components/shared/icons/AppIcon';
import {
  DEFAULT_CURRENCY_CODE,
  formatCurrencyAmount,
} from '../../../constants';
import type {
  CurrencyCode,
  Customer,
  EntityId,
  Order,
  OrderFulfillmentMethod,
  OrderMutationInput,
  OrderSource,
  OrderStatus,
  Product,
  SelectOption,
} from '../../../types/domain';

interface OrderFormPanelProps {
  mode: 'create' | 'edit';
  order?: Order | null;
  customers: Customer[];
  products: Product[];
  statusOptions: SelectOption[];
  sourceOptions: SelectOption[];
  fulfillmentOptions: SelectOption[];
  isSubmitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (payload: OrderMutationInput) => void;
  onRecalculate?: (
    orderId: EntityId,
    payload: OrderMutationInput,
  ) => Promise<Order | null>;
}

interface OrderItemFormState {
  id: string;
  productId: string;
  quantity: string;
}

interface OrderFormState {
  customerId: string;
  status: OrderStatus;
  source: OrderSource;
  fulfillmentMethod: OrderFulfillmentMethod;
  contactName: string;
  contactPhone: string;
  shippingAddress: string;
  notes: string;
  aiGenerated: boolean;
  items: OrderItemFormState[];
}

const labelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted';

const inputClassName = [
  'w-full rounded-lg border border-border-soft/60 bg-surface-card px-3.5 py-2.5 text-sm font-medium text-text-primary',
  'placeholder:text-text-muted outline-none transition duration-fast',
  'focus:border-primary/50 focus:ring-2 focus:ring-primary/20',
  'disabled:cursor-not-allowed disabled:opacity-60',
].join(' ');

function createItemState(
  index: number,
  products: Product[],
  item?: { productId: string; quantity: number },
): OrderItemFormState {
  const fallbackProduct = products[0];
  const productId = item?.productId ?? fallbackProduct?.id ?? '';

  return {
    id: `order-form-item-${index}-${Math.random().toString(36).slice(2, 7)}`,
    productId,
    quantity: String(item?.quantity ?? 1),
  };
}

function createInitialState(
  mode: 'create' | 'edit',
  order: Order | null | undefined,
  customers: Customer[],
  products: Product[],
): OrderFormState {
  const productIds = new Set(products.map((product) => product.id));
  const productIdBySku = new Map(
    products
      .map((product) => ({
        sku: (product.sku ?? '').trim().toUpperCase(),
        id: product.id,
      }))
      .filter((entry) => entry.sku.length > 0)
      .map((entry) => [entry.sku, entry.id] as const),
  );
  const productIdByName = new Map(
    products
      .map((product) => ({
        name: product.name.trim().toLowerCase(),
        id: product.id,
      }))
      .filter((entry) => entry.name.length > 0)
      .map((entry) => [entry.name, entry.id] as const),
  );
  const uuidLikePattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  function resolveInitialProductId(product: Order['items'][number]['product']): string {
    const rawId = String(product.id ?? '').trim();
    if (uuidLikePattern.test(rawId) && productIds.has(rawId)) {
      return rawId;
    }

    const rawSku = String(product.sku ?? '').trim().toUpperCase();
    if (rawSku) {
      const fromSku = productIdBySku.get(rawSku);
      if (fromSku) {
        return fromSku;
      }
    }

    const rawName = String(product.name ?? '').trim().toLowerCase();
    if (rawName) {
      const fromName = productIdByName.get(rawName);
      if (fromName) {
        return fromName;
      }
    }

    return rawId;
  }

  if (mode === 'edit' && order) {
    return {
      customerId: order.customer?.id ?? '',
      status: order.status,
      source: order.source,
      fulfillmentMethod: order.fulfillmentMethod,
      contactName: order.contactName,
      contactPhone: order.contactPhone,
      shippingAddress: order.shippingAddress,
      notes: order.notes ?? '',
      aiGenerated: order.aiGenerated,
      items: order.items.map((item, index) =>
        createItemState(index, products, {
          productId: resolveInitialProductId(item.product),
          quantity: item.quantity,
        }),
      ),
    };
  }

  return {
    customerId: customers[0]?.id ?? '',
    status: 'draft',
    source: 'manual',
    fulfillmentMethod: 'delivery',
    contactName: '',
    contactPhone: '',
    shippingAddress: '',
    notes: '',
    aiGenerated: false,
    items: [createItemState(0, products)],
  };
}

function parsePositiveInteger(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(1, Math.floor(parsed));
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function resolveCurrency(items: OrderItemFormState[], products: Product[]): CurrencyCode {
  const productById = new Map(products.map((product) => [product.id, product]));
  const firstResolved = items.find((item) => productById.has(item.productId));
  if (!firstResolved) {
    return DEFAULT_CURRENCY_CODE;
  }

  return productById.get(firstResolved.productId)?.currency ?? DEFAULT_CURRENCY_CODE;
}

function isRestrictedUnpaidStatus(status: OrderStatus): boolean {
  return status === 'confirmed' || status === 'paid' || status === 'completed';
}

function resolveStatusByPaymentState(
  currentStatus: OrderStatus,
  isPaymentFullyPaid: boolean,
  isPaidOrder: boolean,
): OrderStatus {
  if (isPaymentFullyPaid) {
    if (isPaidOrder && currentStatus === 'completed') {
      return 'completed';
    }

    return 'paid';
  }

  return isRestrictedUnpaidStatus(currentStatus) ? 'waiting_payment' : currentStatus;
}

function OrderFormPanel({
  mode,
  order,
  customers,
  products,
  statusOptions,
  sourceOptions,
  fulfillmentOptions,
  isSubmitting,
  errorMessage,
  onClose,
  onSubmit,
  onRecalculate,
}: OrderFormPanelProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ';
  const [form, setForm] = useState<OrderFormState>(() =>
    createInitialState(mode, order, customers, products),
  );
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [recalculateError, setRecalculateError] = useState<string | null>(null);
  const [recalculatedTotalAmount, setRecalculatedTotalAmount] = useState<number | null>(
    null,
  );
  const didAutoRecalculateRef = useRef(false);

  useEffect(() => {
    setForm(createInitialState(mode, order, customers, products));
    setFieldError(null);
    setRecalculateError(null);
    setRecalculatedTotalAmount(null);
    setIsRecalculating(false);
    didAutoRecalculateRef.current = false;
  }, [mode, order, customers, products]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSubmitting, onClose]);

  const customerOptions = useMemo<SelectOption[]>(
    () =>
      customers.map((customer) => ({
        value: customer.id,
        label: customer.fullName,
      })),
    [customers, t],
  );

  const productOptions = useMemo<SelectOption[]>(
    () =>
      products.map((product) => ({
        value: product.id,
        label: `${product.name} (${product.sku ?? product.id})`,
      })),
    [products],
  );

  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const isPaidOrder = mode === 'edit' && order?.status === 'paid';
  const isPaymentFullyPaid = useMemo(() => {
    if (mode !== 'edit' || !order) {
      return false;
    }

    if (order.paymentStatus === 'paid') {
      return true;
    }

    if (typeof order.paymentRemainingAmount === 'number') {
      return order.paymentRemainingAmount <= 0;
    }

    if (typeof order.paymentCollectedAmount === 'number') {
      return order.paymentCollectedAmount >= order.totalAmount;
    }

    return false;
  }, [
    mode,
    order,
  ]);
  const statusSelectOptions = useMemo<SelectOption[]>(() => {
    return statusOptions.map((option) => {
      const optionStatus = option.value as OrderStatus;

      if (isPaidOrder) {
        return {
          ...option,
          disabled: optionStatus !== 'completed',
        };
      }

      if (isPaymentFullyPaid) {
        return {
          ...option,
          disabled: optionStatus !== 'paid',
        };
      }

      return {
        ...option,
        disabled: isRestrictedUnpaidStatus(optionStatus),
      };
    });
  }, [isPaidOrder, isPaymentFullyPaid, statusOptions]);
  const productIdBySku = useMemo(() => {
    const index = new Map<string, string>();
    for (const product of products) {
      const sku = (product.sku ?? '').trim().toUpperCase();
      if (sku) {
        index.set(sku, product.id);
      }
    }
    return index;
  }, [products]);
  const productIdByName = useMemo(() => {
    const index = new Map<string, string>();
    for (const product of products) {
      const name = product.name.trim().toLowerCase();
      if (name) {
        index.set(name, product.id);
      }
    }
    return index;
  }, [products]);
  const resolveProductUuid = useCallback(
    (rawProductId: string): string => {
      const trimmed = rawProductId.trim();
      if (isUuidLike(trimmed) && productById.has(trimmed)) {
        return trimmed;
      }

      const skuFromLabelMatch = /\(([^()]+)\)\s*$/.exec(trimmed);
      const skuFromLabel = skuFromLabelMatch?.[1]?.trim().toUpperCase() ?? '';
      if (skuFromLabel) {
        const fromLabelSku = productIdBySku.get(skuFromLabel);
        if (fromLabelSku && isUuidLike(fromLabelSku)) {
          return fromLabelSku;
        }
      }

      const fromSku = productIdBySku.get(trimmed.toUpperCase());
      if (fromSku && isUuidLike(fromSku)) {
        return fromSku;
      }

      const fromName = productIdByName.get(trimmed.toLowerCase());
      if (fromName && isUuidLike(fromName)) {
        return fromName;
      }

      return '';
    },
    [productById, productIdByName, productIdBySku],
  );
  const resolveUnitPrice = useCallback(
    (rawProductId: string): number => {
      const productId = resolveProductUuid(rawProductId);
      const product = productId ? productById.get(productId) : undefined;
      const price = product?.promoPrice ?? product?.price ?? 0;
      return Number(Math.max(0, price).toFixed(2));
    },
    [productById, resolveProductUuid],
  );

  useEffect(() => {
    if (products.length === 0) {
      return;
    }

    setForm((current) => {
      let changed = false;
      const nextItems = current.items.map((item) => {
        const resolved = resolveProductUuid(item.productId);
        if (resolved && resolved !== item.productId) {
          changed = true;
          return { ...item, productId: resolved };
        }
        return item;
      });

      if (!changed) {
        return current;
      }

      return {
        ...current,
        items: nextItems,
      };
    });
  }, [products, resolveProductUuid]);

  useEffect(() => {
    setForm((current) => {
      const nextStatus = resolveStatusByPaymentState(
        current.status,
        isPaymentFullyPaid,
        isPaidOrder,
      );

      if (nextStatus === current.status) {
        return current;
      }

      return {
        ...current,
        status: nextStatus,
      };
    });
  }, [isPaidOrder, isPaymentFullyPaid]);

  const itemRows = useMemo(
    () =>
      form.items.map((item) => {
        const quantity = parsePositiveInteger(item.quantity);
        const unitPrice = resolveUnitPrice(item.productId);
        const lineTotal = Number((quantity * unitPrice).toFixed(2));

        return {
          ...item,
          quantity,
          unitPrice,
          lineTotal,
        };
      }),
    [form.items, resolveUnitPrice],
  );

  const totalAmount = useMemo(
    () =>
      Number(
        itemRows.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2),
      ),
    [itemRows],
  );
  const displayedTotalAmount = recalculatedTotalAmount ?? totalAmount;
  const itemRecalculateFingerprint = useMemo(
    () =>
      form.items
        .map((item) => {
          const productId = resolveProductUuid(item.productId);
          const quantity = parsePositiveInteger(item.quantity);
          const unitPrice = resolveUnitPrice(item.productId);
          return `${productId}:${quantity}:${unitPrice}`;
        })
        .join('|'),
    [form.items, resolveProductUuid, resolveUnitPrice],
  );

  const canSubmit = useMemo(() => {
    return (
      isUuidLike(form.customerId.trim()) &&
      form.contactName.trim().length > 0 &&
      form.contactPhone.trim().length > 0 &&
      form.shippingAddress.trim().length > 0 &&
      form.fulfillmentMethod.length > 0 &&
      form.items.length > 0 &&
      form.items.every(
        (item) =>
          resolveProductUuid(item.productId).length > 0 &&
          parsePositiveInteger(item.quantity) > 0,
      )
    );
  }, [form, resolveProductUuid]);

  function updateItem(id: string, patch: Partial<OrderItemFormState>) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));
  }

  function addItemRow() {
    setForm((current) => ({
      ...current,
      items: [...current.items, createItemState(current.items.length, products)],
    }));
  }

  function removeItemRow(id: string) {
    setForm((current) => {
      if (current.items.length <= 1) {
        return current;
      }

      return {
        ...current,
        items: current.items.filter((item) => item.id !== id),
      };
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(null);

    const customerId = form.customerId.trim();
    const contactName = form.contactName.trim();
    const contactPhone = form.contactPhone.trim();
    const shippingAddress = form.shippingAddress.trim();
    const notes = form.notes.trim();

    if (!isUuidLike(customerId) || !contactName || !contactPhone || !shippingAddress) {
      setFieldError(t('orders.form.requiredError'));
      return;
    }

    if (!form.items.length) {
      setFieldError(t('orders.form.itemsRequired'));
      return;
    }

    const normalizedItems = form.items.map((item) => {
      const productId = resolveProductUuid(item.productId);
      const quantity = parsePositiveInteger(item.quantity);
      const unitPrice = resolveUnitPrice(item.productId);

      return {
        productId,
        quantity,
        unitPrice,
      };
    });

    if (normalizedItems.some((item) => !item.productId)) {
      setFieldError(t('orders.form.productRequired'));
      return;
    }

    const currency = resolveCurrency(form.items, products);
    const status = resolveStatusByPaymentState(
      form.status,
      isPaymentFullyPaid,
      isPaidOrder,
    );

    onSubmit({
      customerId,
      status,
      source: form.source,
      fulfillmentMethod: form.fulfillmentMethod,
      contactName,
      contactPhone,
      shippingAddress,
      notes,
      aiGenerated: form.aiGenerated,
      items: normalizedItems,
      currency,
      metadata: {
        source: 'api',
        saved_via: 'orders-form',
      },
    });
  }

  useEffect(() => {
    if (mode !== 'edit' || !order?.id || !onRecalculate) {
      return;
    }
    if (isSubmitting) {
      return;
    }

    if (!didAutoRecalculateRef.current) {
      didAutoRecalculateRef.current = true;
      return;
    }

    const normalizedItems = form.items.map((item) => ({
      productId: resolveProductUuid(item.productId),
      quantity: parsePositiveInteger(item.quantity),
      unitPrice: resolveUnitPrice(item.productId),
    }));
    const hasValidItems =
      normalizedItems.length > 0 &&
      normalizedItems.every((item) => item.productId.length > 0);
    const customerId = form.customerId.trim();
    const hasValidCustomer = isUuidLike(customerId);

    if (!hasValidItems || !hasValidCustomer) {
      setRecalculatedTotalAmount(null);
      setRecalculateError(null);
      return;
    }

    const payload: OrderMutationInput = {
      customerId,
      status: resolveStatusByPaymentState(
        form.status,
        isPaymentFullyPaid,
        isPaidOrder,
      ),
      source: form.source,
      fulfillmentMethod: form.fulfillmentMethod,
      contactName: form.contactName.trim(),
      contactPhone: form.contactPhone.trim(),
      shippingAddress: form.shippingAddress.trim(),
      notes: form.notes.trim(),
      aiGenerated: form.aiGenerated,
      items: normalizedItems,
      currency: resolveCurrency(form.items, products),
      metadata: {
        source: 'api',
        saved_via: 'orders-form',
      },
    };

    let isActive = true;
    const timeoutId = window.setTimeout(async () => {
      setIsRecalculating(true);
      setRecalculateError(null);

      try {
        const recalculated = await onRecalculate(order.id, payload);
        if (!isActive) {
          return;
        }

        setRecalculatedTotalAmount(recalculated?.totalAmount ?? null);
      } catch {
        if (!isActive) {
          return;
        }

        setRecalculateError(t('orders.detail.recalculateError'));
        setRecalculatedTotalAmount(null);
      } finally {
        if (isActive) {
          setIsRecalculating(false);
        }
      }
    }, 360);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [
    itemRecalculateFingerprint,
    isSubmitting,
    mode,
    onRecalculate,
    order?.id,
    products,
    resolveProductUuid,
    resolveUnitPrice,
    isPaidOrder,
    isPaymentFullyPaid,
    t,
  ]);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-background-overlay/72 backdrop-blur-[3px]"
      onClick={() => {
        if (!isSubmitting) {
          onClose();
        }
      }}
      role="presentation"
    >
      <aside
        className="h-full w-full overflow-y-auto bg-background-subtle p-4 shadow-xl ring-1 ring-border-soft/50 min-[641px]:max-w-[620px] min-[641px]:p-5"
        onClick={(event) => event.stopPropagation()}
        aria-label={
          mode === 'create'
            ? t('orders.form.createTitle')
            : t('orders.form.editTitle')
        }
      >
        <header className="mb-4 rounded-xl bg-surface-card p-4 shadow-sm ring-1 ring-border-soft/40">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {t('orders.form.eyebrow')}
              </p>
              <h2 className="mt-1 font-display text-[1.45rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-text-primary">
                {mode === 'create'
                  ? t('orders.form.createTitle')
                  : t('orders.form.editTitle')}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                {mode === 'create'
                  ? t('orders.form.createSubtitle')
                  : t('orders.form.editSubtitle')}
              </p>
            </div>
            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-text-primary shadow-sm transition duration-fast hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-60"
              onClick={onClose}
              disabled={isSubmitting}
              aria-label={t('orders.form.close')}
            >
              <AppIcon name="close" className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
          </div>
        </header>

        <form className="grid gap-3" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-3">
            <label className="grid gap-1.5">
              <span className={labelClassName}>{t('orders.form.customer')}</span>
              <FilterSelect
                value={form.customerId}
                options={customerOptions}
                onChange={(value) =>
                  setForm((current) => ({ ...current, customerId: value }))
                }
                disabled={isSubmitting}
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1.5">
              <span className={labelClassName}>{t('orders.form.status')}</span>
              <FilterSelect
                value={form.status}
                options={statusSelectOptions}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    status: value as OrderStatus,
                  }))
                }
                disabled={isSubmitting || (isPaymentFullyPaid && !isPaidOrder)}
              />
            </label>

            <label className="grid gap-1.5">
              <span className={labelClassName}>{t('orders.form.source')}</span>
              <FilterSelect
                value={form.source}
                options={sourceOptions}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    source: value as OrderSource,
                  }))
                }
                disabled={isSubmitting}
              />
            </label>

            <label className="grid gap-1.5">
              <span className={labelClassName}>
                {t('orders.form.fulfillmentMethod', { defaultValue: 'Bajarish usuli' })}
              </span>
              <FilterSelect
                value={form.fulfillmentMethod}
                options={fulfillmentOptions}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    fulfillmentMethod: value as OrderFulfillmentMethod,
                  }))
                }
                disabled={isSubmitting}
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label className={labelClassName} htmlFor="order-form-contact-name">
                {t('orders.form.contactName')}
              </label>
              <input
                id="order-form-contact-name"
                type="text"
                value={form.contactName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    contactName: event.target.value,
                  }))
                }
                className={inputClassName}
                placeholder={t('orders.form.contactName')}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="grid gap-1.5">
              <label className={labelClassName} htmlFor="order-form-contact-phone">
                {t('orders.form.contactPhone')}
              </label>
              <input
                id="order-form-contact-phone"
                type="text"
                value={form.contactPhone}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    contactPhone: event.target.value,
                  }))
                }
                className={inputClassName}
                placeholder="+998 90 000 0000"
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <label className={labelClassName} htmlFor="order-form-shipping-address">
              {t('orders.form.shippingAddress')}
            </label>
            <textarea
              id="order-form-shipping-address"
              value={form.shippingAddress}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  shippingAddress: event.target.value,
                }))
              }
              className={`${inputClassName} min-h-[86px] resize-y`}
              placeholder={t('orders.form.shippingAddress')}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="grid gap-1.5">
            <label className={labelClassName} htmlFor="order-form-notes">
              {t('orders.form.notes')}
            </label>
            <textarea
              id="order-form-notes"
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
              className={`${inputClassName} min-h-[92px] resize-y`}
              placeholder={t('orders.form.notesPlaceholder')}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl bg-surface-card px-4 py-4 ring-1 ring-border-soft/35">
            <div className="grid gap-0.5">
              <p className="m-0 text-sm font-semibold text-text-primary">
                {t('orders.form.aiGenerated')}
              </p>
              <p className="m-0 text-[12px] text-text-secondary">
                {t('orders.form.aiGeneratedHint')}
              </p>
            </div>
            <Switch
              checked={form.aiGenerated}
              onChange={(nextValue) =>
                setForm((current) => ({
                  ...current,
                  aiGenerated: nextValue,
                }))
              }
              disabled={isSubmitting}
            />
          </div>

          <section className="grid gap-3 rounded-xl bg-surface-card p-3.5 shadow-sm ring-1 ring-border-soft/35">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="m-0 text-base font-semibold text-text-primary">
                {t('orders.form.itemsTitle')}
              </h3>
              <button
                type="button"
                className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary/12 px-3 text-sm font-semibold text-text-accent transition duration-fast hover:bg-primary/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-60"
                onClick={addItemRow}
                disabled={isSubmitting || products.length === 0}
              >
                <AppIcon name="plus" className="h-4 w-4" aria-hidden="true" />
                {t('orders.form.addItem')}
              </button>
            </div>

            {products.length === 0 ? (
              <p className="m-0 rounded-lg bg-warning-bg px-3 py-2 text-sm font-medium text-warning">
                {t('orders.form.noProducts')}
              </p>
            ) : null}

            {form.items.map((item, index) => {
              const resolvedProductId = resolveProductUuid(item.productId);
              const selectedProduct = productById.get(resolvedProductId);
              const quantity = parsePositiveInteger(item.quantity);
              const unitPrice = resolveUnitPrice(item.productId);
              const lineTotal = Number((quantity * unitPrice).toFixed(2));

              return (
                <div
                  key={item.id}
                  className="grid gap-2.5 rounded-xl bg-surface-subtle/85 p-3"
                >
                  <div className="grid gap-2.5 sm:grid-cols-[minmax(0,1fr),140px,auto]">
                    <label className="grid gap-1.5">
                      <span className={labelClassName}>
                        {t('orders.form.product')}
                      </span>
                      <FilterSelect
                        value={item.productId}
                        options={productOptions}
                        onChange={(value) => {
                          updateItem(item.id, {
                            productId: value,
                          });
                        }}
                        disabled={isSubmitting || productOptions.length === 0}
                      />
                    </label>

                    <div className="grid gap-1.5">
                      <label
                        className={labelClassName}
                        htmlFor={`order-form-item-qty-${index}`}
                      >
                        {t('orders.form.quantity')}
                      </label>
                      <input
                        id={`order-form-item-qty-${index}`}
                        type="number"
                        min="1"
                        step="1"
                        inputMode="numeric"
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(item.id, { quantity: event.target.value })
                        }
                        className={inputClassName}
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="grid gap-1.5">
                      <span className={labelClassName}>{t('common.delete')}</span>
                      <button
                        type="button"
                        className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-danger-bg px-3 text-danger transition duration-fast hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/35 disabled:opacity-60"
                        onClick={() => removeItemRow(item.id)}
                        disabled={isSubmitting || form.items.length <= 1}
                        aria-label={t('orders.form.removeItem')}
                      >
                        <FiTrash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-card px-3 py-2">
                    <span className="text-[12px] font-medium text-text-secondary">
                      {selectedProduct?.name ?? t('common.na')}
                    </span>
                    <span className="text-sm font-semibold text-text-primary">
                      {formatCurrencyAmount(lineTotal, locale)}
                    </span>
                  </div>
                </div>
              );
            })}

            <div className="flex items-center justify-between gap-3 rounded-xl bg-primary/10 px-4 py-3">
              <span className="text-sm font-semibold text-text-primary">
                {t('orders.form.totalAmount')}
              </span>
              <span className="text-base font-extrabold text-text-accent">
                {formatCurrencyAmount(displayedTotalAmount, locale)}
              </span>
            </div>

            {mode === 'edit' && isRecalculating ? (
              <p className="m-0 text-[12px] font-medium text-text-secondary">
                {t('orders.actions.recalculating')}
              </p>
            ) : null}

            {mode === 'edit' && recalculateError ? (
              <p className="m-0 rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
                {recalculateError}
              </p>
            ) : null}
          </section>

          {fieldError ? (
            <p className="m-0 rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
              {fieldError}
            </p>
          ) : null}

          {errorMessage ? (
            <p className="m-0 rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
              {errorMessage}
            </p>
          ) : null}

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <button
              type="submit"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition duration-fast hover:bg-primary-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting || !canSubmit}
            >
              {isSubmitting
                ? mode === 'create'
                  ? t('orders.form.creating')
                  : t('orders.form.saving')
                : mode === 'create'
                  ? t('orders.form.createSubmit')
                  : t('orders.form.editSubmit')}
            </button>
            <button
              type="button"
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-surface-card px-4 text-sm font-semibold text-text-secondary shadow-sm ring-1 ring-border-soft/40 transition duration-fast hover:bg-surface-subtle hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

export default OrderFormPanel;
