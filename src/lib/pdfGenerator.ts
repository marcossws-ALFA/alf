import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ServiceOrder, Client, Equipment } from '../types';

export const generateOSPDF = (order: ServiceOrder, client: Client, equipment?: Equipment) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Company Info Constants (User can edit these)
  const company = {
    name: 'ALFAMAQ MANUTENÇÃO',
    document: '00.000.000/0001-00',
    address: 'Rua Exemplo, 123 - Centro, Cidade/UF',
    phone: '(00) 00000-0000',
    email: 'contato@alfamaq.com.br'
  };

  const warrantyTerms = [
    '1. A garantia é de 90 dias a partir da data de entrega, cobrindo apenas os serviços executados e peças substituídas.',
    '2. A garantia será anulada em caso de mau uso, queda, contato com líquidos ou abertura do equipamento por terceiros.',
    '3. Equipamentos não retirados em até 90 dias após a conclusão serão descartados para custear despesas.'
  ];

  // Header Background
  doc.setFillColor(0, 6, 102); // #000666
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  // Logo Placeholder / Company Name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(company.name, 15, 20);
  
  // Company Data in Header
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`CNPJ: ${company.document}`, 15, 28);
  doc.text(`${company.address}`, 15, 33);
  doc.text(`Tel: ${company.phone} | Email: ${company.email}`, 15, 38);

  // OS Title and Number
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('ORDEM DE SERVIÇO', pageWidth - 15, 20, { align: 'right' });
  
  doc.setFontSize(12);
  doc.text(`Nº ${order.number}`, pageWidth - 15, 30, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Data: ${order.createdAt}`, pageWidth - 15, 38, { align: 'right' });

  // Client Info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE', 15, 60);
  doc.setLineWidth(0.5);
  doc.setDrawColor(0, 6, 102);
  doc.line(15, 62, 70, 62);

  doc.setFontSize(10);
  doc.text('Nome:', 15, 70);
  doc.setFont('helvetica', 'normal');
  doc.text(client.name, 45, 70);

  doc.setFont('helvetica', 'bold');
  doc.text('CPF/CNPJ:', 15, 77);
  doc.setFont('helvetica', 'normal');
  doc.text(client.document, 45, 77);

  doc.setFont('helvetica', 'bold');
  doc.text('Telefone:', 15, 84);
  doc.setFont('helvetica', 'normal');
  doc.text(client.mobile || client.phone, 45, 84);

  // Equipment Info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO EQUIPAMENTO', 15, 100);
  doc.line(15, 102, 85, 102);

  doc.setFontSize(10);
  doc.text('Equipamento:', 15, 110);
  doc.setFont('helvetica', 'normal');
  doc.text(equipment ? `${equipment.brand} ${equipment.model}` : order.equipmentName, 45, 110);

  doc.setFont('helvetica', 'bold');
  doc.text('Nº de Série:', 15, 117);
  doc.setFont('helvetica', 'normal');
  doc.text(equipment?.serialNumber || 'N/A', 45, 117);

  if (order.accessories) {
    doc.setFont('helvetica', 'bold');
    doc.text('Acessórios:', 15, 124);
    doc.setFont('helvetica', 'normal');
    const splitAccessories = doc.splitTextToSize(order.accessories, pageWidth - 60);
    doc.text(splitAccessories, 45, 124);
  }

  // Technical Info
  const startY = order.accessories ? 140 : 130;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATO TÉCNICO', 15, startY);
  doc.line(15, startY + 2, 65, startY + 2);

  doc.setFontSize(10);
  doc.text('Defeito Informado:', 15, startY + 10);
  doc.setFont('helvetica', 'normal');
  const splitDefect = doc.splitTextToSize(order.defectDescription || 'Não informado', pageWidth - 30);
  doc.text(splitDefect, 15, startY + 15);

  let currentY = startY + 20 + (splitDefect.length * 5);
  
  if (order.technicalReport) {
    doc.setFont('helvetica', 'bold');
    doc.text('Laudo Técnico:', 15, currentY);
    doc.setFont('helvetica', 'normal');
    const splitReport = doc.splitTextToSize(order.technicalReport, pageWidth - 30);
    doc.text(splitReport, 15, currentY + 5);
    currentY += 10 + (splitReport.length * 5);
  }

  // Parts Table
  if (order.parts && order.parts.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PEÇAS / MATERIAIS', 15, currentY);
    
    autoTable(doc, {
      startY: currentY + 2,
      head: [['Descrição', 'Qtd', 'V. Unitário', 'V. Total']],
      body: order.parts.map(p => [p.description, p.quantity, p.unitPrice, p.totalPrice]),
      headStyles: { fillColor: [0, 6, 102] as [number, number, number] },
      margin: { left: 15, right: 15 }
    });
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Services Table
  if (order.services && order.services.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('SERVIÇOS / MÃO DE OBRA', 15, currentY);
    
    autoTable(doc, {
      startY: currentY + 2,
      head: [['Descrição', 'Qtd', 'V. Unitário', 'V. Total']],
      body: order.services.map(s => [s.description, s.quantity, s.unitPrice, s.totalPrice]),
      headStyles: { fillColor: [0, 6, 102] as [number, number, number] },
      margin: { left: 15, right: 15 }
    });
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Warranty Terms Section
  const warrantyY = Math.max(currentY + 10, pageHeight - 80);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TERMOS DE GARANTIA', 15, warrantyY);
  doc.line(15, warrantyY + 2, 75, warrantyY + 2);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  warrantyTerms.forEach((term, index) => {
    const splitTerm = doc.splitTextToSize(term, pageWidth - 30);
    doc.text(splitTerm, 15, warrantyY + 8 + (index * 10));
  });

  // Footer / Status
  doc.setTextColor(0, 0, 0);
  const footerY = pageHeight - 40;
  doc.setLineWidth(0.1);
  doc.setDrawColor(200, 200, 200);
  doc.line(15, footerY, pageWidth - 15, footerY);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  if (order.payment) {
    let paymentInfo = `Pagamento 1: ${order.payment.method} (${order.payment.paidAmount}) - ${order.payment.status}`;
    if (order.payment.method2) {
      paymentInfo += ` | Pagamento 2: ${order.payment.method2} (${order.payment.paidAmount2}) - ${order.payment.status2 || 'Pendente'}`;
    }
    doc.text(paymentInfo, 15, footerY + 8);
    
    const remainingVal = parseFloat(order.payment.remainingAmount.replace(/[^\d,]/g, '').replace(',', '.') || '0');
    if (remainingVal > 0) {
      doc.text(`Saldo Restante: ${order.payment.remainingAmount}`, 15, footerY + 14);
    }
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Status: ${order.status}`, 15, footerY + 25);
  doc.text(`Valor Total: ${order.total}`, pageWidth - 15, footerY + 25, { align: 'right' });

  return doc;
};

export const generateBudgetPDF = (order: ServiceOrder, client: Client, equipment?: Equipment) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - (margin * 2);

  const company = {
    name: 'ALFAMAQ - 30284153 MARCOS WUELTON SILVEIRA',
    document: '30.284.153/0001-79',
    address: 'RUA CEL ANTONIO ALVARO, 19 - VILA INDUSTRIAL',
    city: 'CAMPINAS / SP - CEP: 13035-520',
    phones: '(19) 3272-3240 / (19) 98936-5488'
  };

  // Header
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(company.name, pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`CNPJ: ${company.document} - TELEFONE: ${company.phones}`, pageWidth / 2, 20, { align: 'center' });
  doc.text(company.address, pageWidth / 2, 24, { align: 'center' });
  doc.text(company.city, pageWidth / 2, 28, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('ORÇAMENTO', pageWidth / 2, 40, { align: 'center' });

  // Helper for drawing grids
  const drawGrid = (y: number, heights: number[], widths: number[][], labels: string[][], values: string[][]) => {
    let currentY = y;
    heights.forEach((h, rowIndex) => {
      let currentX = margin;
      widths[rowIndex].forEach((w, colIndex) => {
        doc.setDrawColor(0);
        doc.setLineWidth(0.2);
        doc.rect(currentX, currentY, w, h);
        
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text(labels[rowIndex][colIndex], currentX + 1, currentY + 3);
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const val = values[rowIndex][colIndex] || '';
        doc.text(val, currentX + w / 2, currentY + h - 2, { align: 'center' });
        
        currentX += w;
      });
      currentY += h;
    });
    return currentY;
  };

  // OS Info Grid
  const osDate = order.createdAt.split(' ')[0] || order.createdAt;
  const osTime = order.createdAt.split(' ')[1] || '';
  const completionDate = order.completionDate?.split(' ')[0] || '';
  const completionTime = order.completionDate?.split(' ')[1] || '';

  let nextY = drawGrid(
    45,
    [10],
    [[25, 30, 25, 30, 25, 55]],
    [['Nº OS', 'Dt. Entrada', 'Hr. Entrada', 'Dt. Saída', 'Hr. Saída', 'Status']],
    [[order.number, osDate, osTime, completionDate, completionTime, order.status]]
  );

  // Client Info Grid
  nextY = drawGrid(
    nextY,
    [10, 10],
    [[70, 25, 30, 35, 30], [70, 25, 45, 40, 10]],
    [
      ['Cliente', 'Celular', 'Telefone', 'CPF/CNPJ', 'RG/Insc. Estadual'],
      ['Endereço', 'Número', 'Bairro', 'Cidade', 'UF']
    ],
    [
      [client.name, client.mobile || '', client.phone || '', client.document, client.stateRegistration || ''],
      [client.street || '', client.number || '', client.neighborhood || '', client.city || '', client.state || '']
    ]
  );

  // Equipment Info Grid
  nextY = drawGrid(
    nextY,
    [10],
    [[35, 45, 30, 25, 55]],
    [['Equipamento', 'Cliente', 'Funcionando?', 'Senha', 'Número de série']],
    [[order.equipmentName, client.name, 'SABE INFORMAR', '', equipment?.serialNumber || '']]
  );

  // Text Sections
  const drawTextSection = (y: number, label: string, value: string, height: number = 10) => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, y + 4);
    doc.rect(margin, y + 5, contentWidth, height);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const splitText = doc.splitTextToSize(value || '', contentWidth - 4);
    doc.text(splitText, margin + 2, y + 9);
    return y + height + 7;
  };

  nextY = drawTextSection(nextY, 'Problema informado', order.defectDescription || '');
  nextY = drawTextSection(nextY, 'Laudo Técnico / Problema constatado', order.technicalReport || '');
  nextY = drawTextSection(nextY, 'Serviço executado', '');
  nextY = drawTextSection(nextY, 'Dados Bancários', '');

  // Additional Info Grid
  nextY = drawGrid(
    nextY,
    [10],
    [[50, 70, 70]],
    [['Acessórios', 'Observações', 'Técnico']],
    [[order.accessories || '', '', order.technician || 'MARCOS']]
  );

  // Tables
  const tableStyles = {
    theme: 'plain' as const,
    styles: { fontSize: 8, cellPadding: 1, lineColor: [0, 0, 0] as [number, number, number], lineWidth: 0.1 },
    headStyles: { fillColor: [240, 240, 240] as [number, number, number], textColor: [0, 0, 0] as [number, number, number], fontStyle: 'bold' as const, halign: 'center' as const },
    columnStyles: {
      0: { cellWidth: 'auto' as const },
      1: { cellWidth: 20 as const, halign: 'center' as const },
      2: { cellWidth: 15 as const, halign: 'center' as const },
      3: { cellWidth: 30 as const, halign: 'center' as const },
      4: { cellWidth: 30 as const, halign: 'center' as const },
    }
  };

  // Parts Table
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, nextY, contentWidth, 5, 'F');
  doc.rect(margin, nextY, contentWidth, 5);
  doc.text('PRODUTO/PEÇA', pageWidth / 2, nextY + 4, { align: 'center' });
  nextY += 5;

  autoTable(doc, {
    ...tableStyles,
    startY: nextY,
    head: [['Produto', 'Unidade', 'Qtde', 'Preço Venda', 'Total']],
    body: (order.parts || []).map(p => [p.description, 'UN', p.quantity, p.unitPrice, p.totalPrice]),
    margin: { left: margin, right: margin },
  });
  nextY = (doc as any).lastAutoTable.finalY + 5;

  // Services Table
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, nextY, contentWidth, 5, 'F');
  doc.rect(margin, nextY, contentWidth, 5);
  doc.text('SERVIÇO', pageWidth / 2, nextY + 4, { align: 'center' });
  nextY += 5;

  autoTable(doc, {
    ...tableStyles,
    startY: nextY,
    head: [['Produto', 'Unidade', 'Qtde', 'Preço Venda', 'Total']],
    body: (order.services || []).map(s => [s.description, 'SERV', s.quantity, s.unitPrice, s.totalPrice]),
    margin: { left: margin, right: margin },
  });
  nextY = (doc as any).lastAutoTable.finalY + 5;

  // Totals Section
  const subtotal = order.payment?.subtotal || order.total;
  const discount = order.payment?.discountValue || '0,00';
  const total = order.total;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Total bruto', margin + 30, nextY);
  doc.text('Desconto', margin + 100, nextY);
  doc.text('Total líquido', margin + 170, nextY);

  doc.setFontSize(11);
  doc.text(subtotal, margin + 30, nextY + 6, { align: 'center' });
  doc.text(discount, margin + 100, nextY + 6, { align: 'center' });
  doc.text(total, margin + 170, nextY + 6, { align: 'center' });

  nextY += 15;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Forma pagamento(1)', margin + 20, nextY);
  doc.text('Valor Pago(1)', margin + 65, nextY);
  doc.text('Forma pagamento(2)', margin + 115, nextY);
  doc.text('Valor Pago(2)', margin + 165, nextY);

  doc.setFontSize(10);
  doc.text(order.payment?.method || '', margin + 20, nextY + 5, { align: 'center' });
  doc.text(order.payment?.paidAmount || '0,00', margin + 65, nextY + 5, { align: 'center' });
  doc.text(order.payment?.method2 || '', margin + 115, nextY + 5, { align: 'center' });
  doc.text(order.payment?.paidAmount2 || '0,00', margin + 165, nextY + 5, { align: 'center' });

  // Signatures
  const sigY = pageHeight - 20;
  doc.setLineWidth(0.5);
  doc.line(margin + 10, sigY, margin + 80, sigY);
  doc.line(pageWidth - margin - 80, sigY, pageWidth - margin - 10, sigY);
  
  doc.setFontSize(8);
  doc.text('Assinatura do Técnico', margin + 45, sigY + 4, { align: 'center' });
  doc.text('Assinatura do Cliente', pageWidth - margin - 45, sigY + 4, { align: 'center' });

  return doc;
};

export const sendOSWhatsApp = (order: ServiceOrder, client: Client) => {
  const phone = (client.mobile || client.phone).replace(/\D/g, '');
  if (!phone) return;

  // Formatação para o Brasil (DDI 55) se não houver DDI
  let formattedPhone = phone;
  if (formattedPhone.length === 10 || formattedPhone.length === 11) {
    formattedPhone = '55' + formattedPhone;
  }

  const message = `Olá ${client.name}, sua Ordem de Serviço Nº ${order.number} foi gerada com sucesso!\n\nStatus: ${order.status}\nEquipamento: ${order.equipmentName}\nValor: ${order.total}\n\nEstamos trabalhando no seu equipamento. Você receberá atualizações em breve.`;
  
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
  
  window.open(whatsappUrl, '_blank');
};

export const generateOSListPDF = (orders: ServiceOrder[]) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(0, 6, 102); // #000666
  doc.rect(0, 0, pageWidth, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO DE ORDENS DE SERVIÇO', 15, 15);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 15, 22);
  doc.text(`Total de Registros: ${orders.length}`, pageWidth - 15, 22, { align: 'right' });

  // Table
  autoTable(doc, {
    startY: 35,
    head: [['Nº O.S.', 'Cliente', 'Equipamento', 'Status', 'Data', 'Total']],
    body: orders.map(o => [
      o.number,
      o.clientName,
      o.equipmentName,
      o.status,
      o.createdAt,
      o.total
    ]),
    headStyles: { fillColor: [0, 6, 102] as [number, number, number] },
    styles: { fontSize: 8 },
    margin: { left: 15, right: 15 }
  });

  return doc;
};
