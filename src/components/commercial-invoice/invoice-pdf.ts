import { format } from 'date-fns'

type Sender = {
  name   : string
  address: string
  city   : string
  phone  : string
  email  : string
  gstin ?: string
}

type InvoiceItem = {
  description    : string
  type_of_packing: string
  quantity       : number
  unit_value     : number
}

type Invoice = {
  invoice_number   : string
  invoice_date     : string
  consignee_name   : string
  consignee_company: string | null
  consignee_address: string
  consignee_city   : string
  consignee_phone  : string
  total_weight     : number
  notes            : string | null
  commercial_invoice_items: InvoiceItem[]
}

export type PrintOptions = {
  printInvoice      : boolean
  printShippingLabel: boolean
}

export function generateInvoiceHTML(
  invoice     : Invoice,
  sender      : Sender,
  logoUrl     : string,
  printOptions: PrintOptions,
): string {
  const date       = format(new Date(invoice.invoice_date), 'dd-MM-yyyy')
  const items      = invoice.commercial_invoice_items
  const totalPkgs  = items.reduce((s, it) => s + it.quantity, 0)
  const totalValue = items.reduce((s, it) => s + it.quantity * it.unit_value, 0)

  const itemRows = items.map(item => `
    <tr>
      <td class="center">${item.quantity}</td>
      <td class="center">${item.type_of_packing}</td>
      <td class="center">${item.description}</td>
      <td class="center">${item.quantity}</td>
      <td class="center">${item.unit_value.toLocaleString()}/-</td>
      <td class="center">${(item.quantity * item.unit_value).toLocaleString()}/-</td>
    </tr>
  `).join('')

  const emptyRows = Array.from({ length: Math.max(0, 8 - items.length) })
    .map(() => `<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>`)
    .join('')

  // ── Invoice page ──────────────────────────────────────────────────────────
  const invoicePage = printOptions.printInvoice ? `
    <div class="page">

      <div class="header-top">
        <div class="logo-area">
          <img src="${logoUrl}" alt="Logo" onerror="this.style.display='none'" />

        </div>
        <div class="invoice-title">INVOICE</div>
        <div class="invoice-date">DATE &nbsp; ${date}</div>
      </div>

      <div class="address-row">
        <div class="address-box left">
          <div class="address-label">SHIPPER</div>
          <div class="address-name">${sender.name}</div>
          <div class="address-detail">
            ${sender.address}<br/>${sender.city}
            ${sender.gstin ? `<br/><span style="font-size:9px;font-weight:700;">GSTIN: ${sender.gstin}</span>` : ''}
          </div>
        </div>
        <div class="address-box">
          <div class="address-label">CONSIGNEE</div>
          <div class="address-name">${invoice.consignee_name}</div>
          ${invoice.consignee_company
            ? `<div class="address-company">${invoice.consignee_company}</div>`
            : ''}
          <div class="address-detail">
            ${invoice.consignee_address}<br/>${invoice.consignee_city}
          </div>
        </div>
      </div>

      <div class="mobile-row">
        <div class="mobile-cell left">MOB NO : ${sender.phone}</div>
        <div class="mobile-cell">MOB NO : ${invoice.consignee_phone}</div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width:60px">NO OF PKGS</th>
            <th style="width:80px">TYPE OF PACKING</th>
            <th>FULL DESCRIPTION OF GOODS</th>
            <th style="width:50px">QTY</th>
            <th style="width:90px">UNIT VALUE</th>
            <th style="width:90px">TOTAL VALUE</th>
          </tr>
        </thead>
        <tbody>${itemRows}${emptyRows}</tbody>
      </table>

      <div class="footer-row">
        <div class="footer-cell bordered">
          NO OF PCKGS
          <div class="footer-value">${totalPkgs}</div>
        </div>
        <div class="footer-cell bordered">
          ${invoice.notes ? invoice.notes.toUpperCase() : 'FOR PERSONAL USE ONLY'}
          <br/>
          <span style="font-size:9px;font-weight:400;">TOTAL WGT</span>
          <div class="footer-value">
            ${invoice.total_weight > 0 ? `${invoice.total_weight} KG` : ''}
          </div>
        </div>
        <div class="footer-cell">
          TOTAL VALUE
          <div class="footer-value">${totalValue.toLocaleString()}/-</div>
        </div>
      </div>

      <div class="declaration">
        I DECLARE ALL THE INFORMATION CONTAINED IN THIS INVOICE TO BE / TRUE AND CORRECT
      </div>

      <div class="signature-area">
        <div class="sig-line"></div>
        <div class="sig-label">SIGNATURE</div>
      </div>

    </div>
  ` : ''

  // ── Shipping label page — matches reference image exactly ─────────────────
  const shippingPage = printOptions.printShippingLabel ? `
    ${printOptions.printInvoice ? '<div style="page-break-before:always;"></div>' : ''}

    <div class="sl-page">

      <!-- Top bar: company name + address -->
      <div class="sl-top-bar">
        <div class="sl-company-name">${sender.name}</div>
        <div class="sl-company-address">
          ${sender.phone}<br/>
          ${sender.address}<br/>
          ${sender.city}<br/>
          ${sender.email}
          ${sender.gstin ? `<br/>${sender.gstin}` : ''}
        </div>
      </div>

      <!-- Black header -->
      <div class="sl-header">
        <div class="sl-header-title">SHIPPING INFORMATION</div>
      </div>

      <!-- Field grid -->
      <div class="sl-fields">

        <!-- Row 1: Name | Phone -->
        <div class="sl-row">
          <div class="sl-field sl-field-border-right">
            <div class="sl-field-label">NAME</div>
            <div class="sl-field-value sl-value-large">${invoice.consignee_name}</div>
          </div>
          <div class="sl-field">
            <div class="sl-field-label">PHONE NUMBER</div>
            <div class="sl-field-value sl-value-large">${invoice.consignee_phone}</div>
          </div>
        </div>

        ${invoice.consignee_company ? `
        <!-- Row: Company -->
        <div class="sl-row">
          <div class="sl-field" style="border-right:none;">
            <div class="sl-field-label">COMPANY</div>
            <div class="sl-field-value sl-value-medium">${invoice.consignee_company}</div>
          </div>
        </div>
        ` : ''}

        <!-- Row 2: Address -->
        <div class="sl-row">
          <div class="sl-field sl-field-tall" style="border-right:none;">
            <div class="sl-field-label">ADDRESS</div>
            <div class="sl-field-value sl-value-medium">${invoice.consignee_address}</div>
          </div>
        </div>

        <!-- Row 3: City | Code/ZIP | Content -->
        <div class="sl-row" style="border-bottom:none;">
          <div class="sl-field sl-field-border-right">
            <div class="sl-field-label">CITY</div>
            <div class="sl-field-value sl-value-large">${invoice.consignee_city.split(' - ')[0] || invoice.consignee_city}</div>
          </div>
          <div class="sl-field sl-field-border-right">
            <div class="sl-field-label">CODE / ZIP</div>
            <div class="sl-field-value sl-value-large">${invoice.consignee_city.includes(' - ') ? invoice.consignee_city.split(' - ')[1] : ''}</div>
          </div>
          <div class="sl-field">
            <div class="sl-field-label">CONTENT</div>
            <div class="sl-field-value sl-value-medium">
              ${items[0]?.description ?? 'Electronic Device'}
            </div>
          </div>
        </div>

      </div>
    </div>
  ` : ''

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }

    body {
      font-family : Arial, sans-serif;
      font-size   : 11px;
      color       : #000;
      background  : #fff;
    }

    @page { size: A4 portrait; margin: 10mm; }

    /* ── Invoice styles ── */
    .page {
      width : 190mm;
      margin: 0 auto;
      border: 2px solid #000;
    }

    .header-top {
      display        : flex;
      align-items    : center;
      justify-content: space-between;
      padding        : 8px 12px;
      border-bottom  : 1.5px solid #000;
    }

    .logo-area {
      display    : flex;
      align-items: center;
      gap        : 10px;
    }

    .logo-area img {
      height       : 150px;
      width        : 150px;
      object-fit   : contain;
      border-radius: 4px;
    }

    .company-name-header { font-size:13px; font-weight:900; }
    .gstin { font-size:9px; color:#555; margin-top:2px; font-weight:600; }
    .invoice-title { text-align:center; font-size:16px; font-weight:900; letter-spacing:3px; }
    .invoice-date  { text-align:right; font-size:11px; font-weight:700; }

    .address-row {
      display              : grid;
      grid-template-columns: 1fr 1fr;
      border-bottom        : 1.5px solid #000;
    }

    .address-box      { padding:10px 12px; }
    .address-box.left { border-right:1.5px solid #000; }
    .address-label    { font-size:9px; font-weight:900; letter-spacing:1px; text-align:center; text-decoration:underline; margin-bottom:6px; }
    .address-name     { font-size:12px; font-weight:700; text-align:center; }
    .address-company  { font-size:13px; font-weight:900; text-align:center; margin-top:2px; }
    .address-detail   { font-size:10px; text-align:center; margin-top:4px; line-height:1.5; }

    .mobile-row {
      display              : grid;
      grid-template-columns: 1fr 1fr;
      border-bottom        : 1.5px solid #000;
      font-size            : 11px;
      font-weight          : 700;
    }

    .mobile-cell      { padding:6px 12px; text-align:center; }
    .mobile-cell.left { border-right:1.5px solid #000; }

    .items-table { width:100%; border-collapse:collapse; }

    .items-table th {
      border-bottom: 1.5px solid #000;
      border-right : 1px solid #000;
      padding      : 5px 4px;
      text-align   : center;
      font-size    : 10px;
      font-weight  : 900;
      background   : #f5f5f5;
    }

    .items-table th:last-child { border-right:none; }

    .items-table td {
      border-bottom: 1px solid #ccc;
      border-right : 1px solid #ccc;
      padding      : 5px 4px;
      height       : 28px;
    }

    .items-table td:last-child { border-right:none; }
    .center { text-align:center; }

    .footer-row {
      display              : grid;
      grid-template-columns: 1fr 1fr 1fr;
      border-top           : 1.5px solid #000;
    }

    .footer-cell          { padding:6px 8px; text-align:center; font-size:10px; font-weight:700; }
    .footer-cell.bordered { border-right:1.5px solid #000; }
    .footer-value         { font-size:12px; font-weight:900; margin-top:2px; }

    .declaration {
      border-top   : 1.5px solid #000;
      padding      : 7px 12px;
      font-size    : 10px;
      font-weight  : 700;
      text-align   : center;
      letter-spacing: 0.5px;
    }

    .signature-area { padding:20px 12px 10px; }
    .sig-line  { width:120px; border-bottom:1.5px solid #000; margin-bottom:4px; }
    .sig-label { font-size:10px; font-weight:700; }

    /* ── Shipping label styles — matches reference exactly ── */
    .sl-page {
      width : 190mm;
      margin: 0 auto;
      border: 2px solid #000;
    }

    .sl-top-bar {
      display        : flex;
      align-items    : flex-start;
      justify-content: space-between;
      padding        : 12px 16px;
      border-bottom  : 2px solid #000;
      gap            : 20px;
    }

    .sl-company-name    { font-size:15px; font-weight:900; color:#000; }
    .sl-company-address { font-size:9px; color:#222; line-height:1.6; text-align:right; max-width:260px; }

    .sl-header {
      display        : flex;
      align-items    : center;
      justify-content: space-between;
      padding        : 14px 16px;
      background     : #000;
      border-bottom  : 2px solid #000;
    }

    .sl-header-title {
      font-size     : 22px;
      font-weight   : 900;
      color         : #fff;
      letter-spacing: 2px;
      text-transform: uppercase;
    }

    .sl-fields { width:100%; }

    .sl-row {
      display      : flex;
      border-bottom: 2px solid #000;
    }

    .sl-field {
      flex          : 1;
      min-height    : 70px;
      display       : flex;
      flex-direction: column;
      padding       : 8px 12px 10px;
    }

    .sl-field-border-right { border-right: 2px solid #000; }
    .sl-field-tall         { min-height: 90px; }

    .sl-field-label {
      font-size     : 8px;
      font-weight   : 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color         : #555;
      margin-bottom : 8px;
    }

    .sl-field-value { font-weight:700; color:#000; line-height:1.2; margin-top:auto; }
    .sl-value-large  { font-size:20px; font-weight:900; }
    .sl-value-medium { font-size:14px; font-weight:700; }
    .sl-value-small  { font-size:12px; font-weight:600; }

    @media print {
      * { print-color-adjust:exact; -webkit-print-color-adjust:exact; }
    }
  </style>
</head>
<body>
  ${invoicePage}
  ${shippingPage}
</body>
</html>`
}