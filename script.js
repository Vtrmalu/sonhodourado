
async function initDB() {
  db = await idb.openDB(dbName, dbVersion, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('partyInfo')) {
        db.createObjectStore('partyInfo', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('guests')) {
        db.createObjectStore('guests', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('outOfListGuests')) {
        db.createObjectStore('outOfListGuests', { keyPath: 'id', autoIncrement: true });
      }
    }
  });
}

async function loadDataFromDB() {
  const tx = await db.transaction(['partyInfo', 'guests', 'outOfListGuests'], 'readonly');
  partyInfo = await tx.objectStore('partyInfo').get(1) || {};
  guests = await tx.objectStore('guests').getAll() || [];
  outOfListGuests = await tx.objectStore('outOfListGuests').getAll() || [];
  displayPartyInfo();
  renderGuestLists();
  updateStats();
}

initDB().then(() => loadDataFromDB());

// Configuração do Tailwind (movida do inline)
tailwind.config = {
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            colors: {
                'sonho-gold': '#D4AF37',
                'sonho-dark': '#1C1C1C',
                'sonho-light': '#F8F4F2',
            }
        }
    }
};

// Resto do código JavaScript original
const { jsPDF: JsPdfConstructor } = window.jspdf;
window.jsPDF = JsPdfConstructor;
let guests = [];
let partyInfo = {};
let outOfListGuests = [];

const partyInfoEl = document.getElementById('party-info');
const adultGuestListContainer = document.getElementById('adult-guest-list');
const childGuestListContainer = document.getElementById('child-guest-list');
const totalGuestsEl = document.getElementById('total-guests');
const presentGuestsEl = document.getElementById('present-guests');
const adultsPresentEl = document.getElementById('present-adults');
const minorsPresentEl = document.getElementById('present-minors');
const totalContractedEl = document.getElementById('total-contracted');
const totalExcedentsEl = document.getElementById('total-excedents');
const reportPdfBtn = document.getElementById('report-pdf-btn');
const printPdfBtn = document.getElementById('print-pdf-btn');
const loadTxtBtnControl = document.getElementById('load-txt-btn-control');
const loadTxtInputControl = document.getElementById('load-txt-input-control');

const outOfListNameInput = document.getElementById('out-of-list-name');
const outOfListTypeSelect = document.getElementById('out-of-list-type');
const addOutOfListBtn = document.getElementById('add-out-of-list-btn');
const outOfListGuestListContainer = document.getElementById('out-of-list-guest-list');

// IndexedDB setup (da Parte 1 do guia)
const dbName = 'FestaDB';
const dbVersion = 1;
let db;

async function initDB() {
  db = await idb.openDB(dbName, dbVersion, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('partyInfo')) {
        db.createObjectStore('partyInfo', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('guests')) {
        db.createObjectStore('guests', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('outOfListGuests')) {
        db.createObjectStore('outOfListGuests', { keyPath: 'id', autoIncrement: true });
      }
    }
  });
}

async function loadDataFromDB() {
  const tx = await db.transaction(['partyInfo', 'guests', 'outOfListGuests'], 'readonly');
  partyInfo = await tx.objectStore('partyInfo').get(1) || {};
  guests = await tx.objectStore('guests').getAll() || [];
  outOfListGuests = await tx.objectStore('outOfListGuests').getAll() || [];
  displayPartyInfo();
  renderGuestLists();
  updateStats();
}

initDB().then(() => loadDataFromDB());

// Função loadDataFromFile adaptada para DB
async function loadDataFromFile(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.partyInfo && data.guests) {
        const tx = await db.transaction(['partyInfo', 'guests', 'outOfListGuests'], 'readwrite');
        await tx.objectStore('partyInfo').put({ id: 1, ...data.partyInfo });
        await tx.objectStore('guests').clear();
        for (let guest of data.guests) {
          await tx.objectStore('guests').add(guest);
        }
        await tx.objectStore('outOfListGuests').clear();
        await tx.done;
        loadDataFromDB();
      } else {
        alert('Ficheiro inválido.');
      }
    } catch (error) {
      alert('Erro ao carregar.');
    }
  };
  reader.readAsText(file);
}

function displayPartyInfo() {
  partyInfoEl.innerHTML = `
      <p><strong>Nome do Aniversariante:</strong> ${partyInfo.name || 'Não Informado'}</p>
      <p><strong>Idade:</strong> ${partyInfo.age || 'Não Informada'}</p>
      <p><strong>Data da Festa:</strong> ${partyInfo.date || 'Não Informada'}</p>
  `;
  totalContractedEl.textContent = partyInfo.guestCount || 0;
}

function updateStats() {
  const allGuests = [...guests, ...outOfListGuests];
  const total = allGuests.length;
  const present = allGuests.filter(guest => guest.isPresent).length;
  const adultsPresent = allGuests.filter(guest => guest.isPresent && guest.type === 'adulto').length;
  const minorsPresent = allGuests.filter(guest => guest.isPresent && guest.type === 'crianca').length;
  const totalAdults = adultsPresent;
  const excedents = totalAdults > (partyInfo.guestCount || 0) ? totalAdults - (partyInfo.guestCount || 0) : 0;
  
  totalGuestsEl.textContent = total;
  presentGuestsEl.textContent = present;
  adultsPresentEl.textContent = adultsPresent;
  minorsPresentEl.textContent = minorsPresent;
  totalExcedentsEl.textContent = excedents;
}

function createGuestItem(guest, isOutOfList = false) {
    const guestItem = document.createElement('div');
    guestItem.classList.add('flex', 'items-center', 'justify-between', 'p-3', 'rounded-lg', 'bg-gray-200', 'hover:bg-gray-300', 'transition-colors');

    const nameTypeDiv = document.createElement('div');
    nameTypeDiv.classList.add('flex', 'items-center', 'space-x-2');
    const nameSpan = document.createElement('span');
    nameSpan.className = 'text-lg font-medium';
    nameSpan.textContent = guest.name;

    const typeSpan = document.createElement('span');
    typeSpan.classList.add('text-sm', 'text-gray-500');
    typeSpan.textContent = `(${guest.type === 'adulto' ? 'Adulto' : 'Criança'})`;

    nameTypeDiv.appendChild(nameSpan);
    nameTypeDiv.appendChild(typeSpan);

    const presenceBtn = document.createElement('button');
    presenceBtn.classList.add('ml-auto', 'px-4', 'py-1', 'rounded-lg', 'font-semibold', 'transition-colors');

    if (guest.isPresent) {
        presenceBtn.classList.add('bg-green-600', 'hover:bg-green-700', 'text-white');
        nameSpan.classList.add('line-through', 'text-gray-500');
        presenceBtn.textContent = 'Presente';
    } else {
        presenceBtn.classList.add('bg-red-600', 'hover:bg-red-700', 'text-white');
        nameSpan.classList.remove('line-through', 'text-gray-500');
        nameSpan.classList.add('text-gray-900');
        presenceBtn.textContent = 'Não Presente';
    }

    // Modificação aqui: Adicione async e atualização no DB
    presenceBtn.addEventListener('click', async () => {
        guest.isPresent = !guest.isPresent;
        const storeName = isOutOfList ? 'outOfListGuests' : 'guests';
        const tx = await db.transaction(storeName, 'readwrite');
        await tx.objectStore(storeName).put(guest); // Atualiza o guest no DB
        await tx.done;
        renderGuestLists(); // Atualiza a lista na tela
    });

    guestItem.appendChild(nameTypeDiv);
    guestItem.appendChild(presenceBtn);
    return guestItem;
}
function renderGuestLists() {
  adultGuestListContainer.innerHTML = '';
  childGuestListContainer.innerHTML = '';
  outOfListGuestListContainer.innerHTML = '';

  const sortedGuests = [...guests].sort((a, b) => a.name.localeCompare(b.name));
  const adults = sortedGuests.filter(guest => guest.type === 'adulto');
  const children = sortedGuests.filter(guest => guest.type === 'crianca');

  let lastInitialAdult = '';
  adults.forEach(guest => {
      const initial = guest.name.charAt(0).toUpperCase();
      if (initial !== lastInitialAdult) {
          const initialEl = document.createElement('div');
          initialEl.classList.add('text-lg', 'font-bold', 'text-center', 'bg-gray-300', 'py-1', 'rounded-md', 'mb-2');
          initialEl.textContent = initial;
          adultGuestListContainer.appendChild(initialEl);
          lastInitialAdult = initial;
      }
      const guestItem = createGuestItem(guest);
      adultGuestListContainer.appendChild(guestItem);
  });

  let lastInitialChild = '';
  children.forEach(guest => {
      const initial = guest.name.charAt(0).toUpperCase();
      if (initial !== lastInitialChild) {
          const initialEl = document.createElement('div');
          initialEl.classList.add('text-lg', 'font-bold', 'text-center', 'bg-gray-300', 'py-1', 'rounded-md', 'mb-2');
          initialEl.textContent = initial;
          childGuestListContainer.appendChild(initialEl);
          lastInitialChild = initial;
      }
      const guestItem = createGuestItem(guest);
      childGuestListContainer.appendChild(guestItem);
  });
  
  outOfListGuests.forEach(guest => {
      const guestItem = createGuestItem(guest, true);
      outOfListGuestListContainer.appendChild(guestItem);
  });

  updateStats();
}

function generatePrintableListPdf() {
  if (!partyInfo.name) {
      alert('Por favor, carregue um arquivo de festa primeiro.');
      return;
  }

  const doc = new JsPdfConstructor('p', 'mm', 'a4');
  const pageMargin = 15;
  const headerHeight = 30; // Increased to accommodate additional lines
  const tableStartY = pageMargin + headerHeight;

  const allGuests = [...guests, ...outOfListGuests].sort((a, b) => a.name.localeCompare(b.name));
  const adults = allGuests.filter(g => g.type === 'adulto');
  const children = allGuests.filter(g => g.type === 'crianca');

  let tableRows = [];
  let currentAdultIndex = 0;
  let currentChildIndex = 0;
  let lastInitialAdult = '';
  let lastInitialChild = '';

  while (currentAdultIndex < adults.length || currentChildIndex < children.length) {
      let adultRowContent = [];
      if (currentAdultIndex < adults.length) {
          const guest = adults[currentAdultIndex];
          const initial = guest.name.charAt(0).toUpperCase();
          if (initial !== lastInitialAdult) {
              adultRowContent = [{ content: initial, colSpan: 2, styles: { fillColor: [212, 175, 55], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' } }];
              lastInitialAdult = initial;
          } else {
              adultRowContent = [{ content: guest.name }, { content: ' ' }];
              currentAdultIndex++;
          }
      }

      let childRowContent = [];
      if (currentChildIndex < children.length) {
          const guest = children[currentChildIndex];
          const initial = guest.name.charAt(0).toUpperCase();
          if (initial !== lastInitialChild) {
              childRowContent = [{ content: initial, colSpan: 2, styles: { fillColor: [212, 175, 55], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' } }];
              lastInitialChild = initial;
          } else {
              childRowContent = [{ content: guest.name }, { content: ' ' }];
              currentChildIndex++;
          }
      }

      let fullRow = [...adultRowContent, ...childRowContent];
      if (adultRowContent.length === 0) {
          fullRow.unshift({ content: '' }, { content: '' });
      }
      if (childRowContent.length === 0) {
          fullRow.push({ content: '' }, { content: '' });
      }

      tableRows.push(fullRow);
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("Lista de Convidados", doc.internal.pageSize.width / 2, pageMargin + 5, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Aniversariante: ${partyInfo.name || 'N/A'}`, pageMargin, pageMargin + 12);
  doc.text(`Idade: ${partyInfo.age || 'N/A'}`, pageMargin, pageMargin + 17);
  doc.text(`Data: ${partyInfo.date || 'N/A'}`, pageMargin, pageMargin + 22);
  doc.text(`Convidados Contratados: ${partyInfo.guestCount || 'N/A'}`, pageMargin, pageMargin + 27);
  doc.text(`Total de Convidados Presentes: ___________`, doc.internal.pageSize.width - pageMargin, pageMargin + 12, { align: 'right' });
  doc.text(`Total de Excedentes: ___________`, doc.internal.pageSize.width - pageMargin, pageMargin + 17, { align: 'right' });
  doc.text(`Página 1`, doc.internal.pageSize.width - pageMargin, pageMargin + 5, { align: 'right' });

  doc.autoTable({
      startY: tableStartY,
      head: [
          [{ content: 'Adultos', colSpan: 2, styles: { halign: 'center', fillColor: [212, 175, 55], textColor: [0, 0, 0], fontStyle: 'bold' } },
          { content: 'Crianças', colSpan: 2, styles: { halign: 'center', fillColor: [212, 175, 55], textColor: [0, 0, 0], fontStyle: 'bold' } }]
      ],
      body: tableRows,
      theme: 'plain',
      styles: { fontSize: 9, font: 'helvetica', cellPadding: 1 },
      columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 10 },
          2: { cellWidth: 80 },
          3: { cellWidth: 10 }
      },
      didDrawCell: (data) => {
          if (data.section === 'body' || data.section === 'head') {
              doc.setDrawColor(0, 0, 0);
              doc.setLineWidth(0.2);
              const startX = data.cell.x;
              const endX = startX + data.cell.width;
              const startY = data.cell.y;
              const endY = startY + data.cell.height;
              // top
              doc.line(startX, startY, endX, startY);
              // bottom
              doc.line(startX, endY, endX, endY);
              // left if starting at group start
              if (data.column.index === 0 || data.column.index === 2) {
                  doc.line(startX, startY, startX, endY);
              }
              // right if end of group
              const colSpan = data.cell.colSpan || 1;
              const endCol = data.column.index + colSpan - 1;
              if (endCol === 1 || endCol === 3) {
                  doc.line(endX, startY, endX, endY);
              }
          }
          if (data.section === 'body' && (data.column.index === 1 || data.column.index === 3) && (data.cell.colSpan === 1 || data.cell.colSpan === undefined)) {
              const prevIndex = data.column.index - 1;
              const prevCell = data.row.cells[prevIndex];
              if (prevCell) {
                  let prevContent = prevCell.raw;
                  if (typeof prevContent === 'object' && prevContent !== null && prevContent.content !== undefined) {
                      prevContent = prevContent.content;
                  }
                  if (typeof prevContent === 'string' && prevContent.trim() !== '') {
                      doc.rect(data.cell.x + data.cell.width / 2 - 2, data.cell.y + data.cell.height / 2 - 2, 4, 4);
                  }
              }
          }
      },
      didDrawPage: (data) => {
          if (data.pageNumber > 1) {
              doc.setFontSize(10);
              doc.setFont('helvetica', 'normal');
              doc.text(`Página ${data.pageNumber}`, doc.internal.pageSize.width - pageMargin, pageMargin + 5, { align: 'right' });
          }
      }
  });

  const filename = `lista_para_impressao_${(partyInfo.name || '').replace(/[^a-zA-Z0-9]/g, '_')}_${(partyInfo.date || '').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(filename);
}

function generateReportPdf() {
  if (!partyInfo.name) {
      alert('Por favor, carregue um arquivo de festa primeiro.');
      return;
  }

  const doc = new JsPdfConstructor('p', 'mm', 'a4');
  const margin = 15;
  let y = margin;
  
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(`Relatório da Festa de ${partyInfo.name || ''}`, 105, y, null, null, "center");
  y += 10;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Aniversariante: ${partyInfo.name || 'Não Informado'}`, margin, y);
  y += 7;
  doc.text(`Idade: ${partyInfo.age || 'Não Informada'}`, margin, y);
  y += 7;
  doc.text(`Data da Festa: ${partyInfo.date || 'Não Informada'}`, margin, y);
  y += 7;
  doc.text(`Convidados Contratados: ${partyInfo.guestCount || 'Não Informado'}`, margin, y);
  y += 10;
  doc.text(`Total de Pessoas na Lista: ${guests.length + outOfListGuests.length}`, margin, y);
  y += 7;
  doc.text(`Total de Pessoas Presentes: ${[...guests, ...outOfListGuests].filter(g => g.isPresent).length}`, margin, y);
  y += 7;
  doc.text(`Total de Adultos Presentes: ${[...guests, ...outOfListGuests].filter(g => g.type === 'adulto' && g.isPresent).length}`, margin, y);
  y += 7;
  doc.text(`Total de Crianças Presentes: ${[...guests, ...outOfListGuests].filter(g => g.type === 'crianca' && g.isPresent).length}`, margin, y);
  y += 7;
  doc.text(`Total de Excedentes: ${([ ...guests.filter(g => g.isPresent && g.type === 'adulto'), ...outOfListGuests.filter(g => g.isPresent && g.type === 'adulto')].length > partyInfo.guestCount) ? ([ ...guests.filter(g => g.isPresent && g.type === 'adulto'), ...outOfListGuests.filter(g => g.type === 'adulto')].length - partyInfo.guestCount) : 0}`, margin, y);
  y += 10;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("Lista de Convidados", margin, y);
  y += 5;
  
  const tableData = [...guests, ...outOfListGuests].sort((a, b) => a.name.localeCompare(b.name)).map(g => [g.name, g.type === 'adulto' ? 'Adulto' : 'Criança', g.isPresent ? 'Presente' : 'Não Presente']);
  
  doc.autoTable({
      startY: y,
      head: [['Nome', 'Tipo', 'Status']],
      body: tableData,
      theme: 'grid',
      styles: {
          font: 'helvetica',
          fontSize: 10,
          cellPadding: 2,
      },
      headStyles: {
          fillColor: [211, 211, 211],
          textColor: [0, 0, 0],
          fontStyle: 'bold'
      },
      didDrawPage: function (data) {
          if (data.pageCount > 1) {
              doc.setFontSize(10);
              doc.text("Página " + data.pageNumber, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10, { align: 'right' });
          }
      }
  });

  doc.save(`relatorio_festa_${partyInfo.name || ''}_${partyInfo.date || ''}.pdf`.replace(/ /g, '_'));
}

loadTxtBtnControl.addEventListener('click', () => loadTxtInputControl.click());
loadTxtInputControl.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
      loadDataFromFile(file);
  }
});

addOutOfListBtn.addEventListener('click', async () => {
  const name = outOfListNameInput.value.trim();
  const type = outOfListTypeSelect.value;
  if (name) {
    const tx = await db.transaction('outOfListGuests', 'readwrite');
    await tx.objectStore('outOfListGuests').add({ name, type, isPresent: true });
    await tx.done;
    loadDataFromDB();
  }
});
outOfListNameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
      addOutOfListBtn.click();
  }
});

reportPdfBtn.addEventListener('click', generateReportPdf);
printPdfBtn.addEventListener('click', generatePrintableListPdf);