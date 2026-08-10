# Chikko Frontend Uchun Oxirgi Backend O'zgarishlar

## Productni Rasmdan Qo'shish

Yangi API qo'shildi:

`POST /api/products/from-photo/`

Bu endpoint CRM/frontend orqali productni nomi va rasmi bilan yaratish uchun ishlatiladi.

### Nima Qiladi

- Admin product nomini yozadi.
- Product rasmi upload qilinadi.
- Backend rasm backgroundini tozalashga harakat qiladi.
- Rasm marketplace formatida 1200x1200 oq fonda tekis qilib saqlanadi.
- Agar rasm ichida ishlab chiqaruvchi yozgan text bo'lsa, OCR orqali text olinib `description`ga yoziladi.
- Product uchun `sku` berilmasa, nomidan avtomatik unique SKU yaratiladi.
- Product yaratilib, processed rasm `images` ichida qaytadi.

### Request

`multipart/form-data` yuboriladi.

Majburiy fieldlar:

- `name` - product nomi
- `image` - product rasmi

Optional fieldlar:

- `sku`
- `category_id`
- `brand_id`
- `description`
- `extract_description` - default `true`
- `price` - default `0.00`
- `currency` - default `UZS`
- `stock_quantity` - default `0`
- `minimal_stock` - default `0`
- `is_promoted` - default `false`
- `reviews_enabled` - default `true`
- `is_active` - default `true`

### Example FormData

```js
const formData = new FormData();
formData.append("name", "Nan Optipro 1 400gr");
formData.append("image", file);
formData.append("category_id", categoryId);
formData.append("brand_id", brandId);
formData.append("price", "105000.00");
formData.append("stock_quantity", "12");
formData.append("minimal_stock", "3");
formData.append("extract_description", "true");

const response = await fetch(`${API_URL}/api/products/from-photo/`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`
  },
  body: formData
});

const product = await response.json();
```

`Content-Type`ni qo'lda yozmang. Browser FormData uchun boundaryni o'zi qo'yadi.

### Response

Oddiy product response qaytadi:

```json
{
  "id": "...",
  "name": "Nan Optipro 1 400gr",
  "sku": "NAN-OPTIPRO-1-400GR",
  "description": "OCRdan olingan yoki frontend yuborgan text",
  "price": "105000.00",
  "currency": "UZS",
  "stock_quantity": 12,
  "minimal_stock": 3,
  "category": {},
  "brand": {},
  "images": [
    {
      "id": "...",
      "sort_order": 0,
      "image_url": "https://.../media/products/...jpg"
    }
  ],
  "metadata": {
    "photo_import": {
      "background_removed": true,
      "ocr_available": true,
      "description_extracted": true
    }
  }
}
```

### Frontendda Ishlatish Tartibi

1. Product create sahifasida `Rasmdan qo'shish` degan alohida flow qiling.
2. User product nomini yozadi.
3. User product rasmini upload qiladi yoki kameradan oladi.
4. Optional: category, brand, price, stock kiritiladi.
5. `POST /api/products/from-photo/` chaqiriladi.
6. Response kelganda product detail sahifasiga o'tkazing yoki edit modal oching.
7. `description` OCRdan kelgan bo'lsa, userga edit qilish imkonini bering.
8. `images[0].image_url` orqali processed rasmni previewda ko'rsating.

### Muhim Eslatma

OCR har doim 100% aniq bo'lmaydi. Shuning uchun frontend descriptionni avtomatik to'ldirib, lekin admin tahrirlashi mumkin qilishi kerak.

Background removal sifati rasmga bog'liq. Oddiy fonli product rasmlarida yaxshi ishlaydi. Murakkab fonlarda backend fallback qilib rasmni baribir oq marketplace canvasga joylaydi.

## Mavjud Product Image Upload

Avvalgi endpoint hali ham ishlaydi:

`POST /api/products/{product_id}/upload-images/`

Bu faqat mavjud productga image qo'shish uchun. Yangi productni rasmdan yaratish uchun `from-photo` ishlatilsin.

## Auth

Endpoint authenticated va product manage permission talab qiladi.

Header:

```http
Authorization: Bearer ACCESS_TOKEN
```
