document.addEventListener('DOMContentLoaded', () => {
  const panel = document.getElementById('seoul');
  const shared = ['bookings', 'maps'].map(id => document.getElementById(id));
  const destinations = { bookings: 'seoul-bookings', maps: 'seoul-maps' };
  const originals = document.querySelector('#bookings');
  originals?.querySelectorAll('.booking-card').forEach(card => {
    const title = card.querySelector('h4')?.textContent || '';
    if (!/Сеул|Seoul/.test(title)) return;
    const copy = card.cloneNode(true);
    copy.removeAttribute('id');
    copy.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
    const group = card.closest('.flights') ? 'flights' : 'hotels';
    panel.querySelector(`#seoul-bookings .${group} .booking-grid`).append(copy);
  });
  const syncSections = () => {
    const selected = panel.classList.contains('active');
    shared.forEach(section => { if (section) section.hidden = selected; });
    document.querySelectorAll('.section-nav a').forEach(link => {
      const original = link.dataset.tripTarget || link.hash.slice(1);
      link.dataset.tripTarget = original;
      link.href = '#' + (selected ? destinations[original] || original : original);
    });
  };
  document.querySelectorAll('.route-tab').forEach(tab => {
    tab.addEventListener('click', syncSections);
    tab.addEventListener('keydown', () => queueMicrotask(syncSections));
  });
  const select = document.getElementById('seoul-map-stop');
  const showMap = () => {
    const query = encodeURIComponent(select.value);
    document.getElementById('seoul-map-frame').src = `https://www.google.com/maps?q=${query}&output=embed&hl=ru&z=13`;
    document.getElementById('seoul-map-open').href = `https://map.naver.com/p/search/${query}`;
  };
  select.addEventListener('change', showMap);
  showMap();
  const stops = [...panel.querySelectorAll('.road-stop')];
  panel.querySelectorAll('.roadmap .road-table tbody tr').forEach((row, index) => {
    const details = row.querySelector('.table-details-body');
    stops[index]?.querySelectorAll('.seoul-place').forEach(place => {
      const copy = place.cloneNode(true);
      copy.removeAttribute('id');
      details?.append(copy);
    });
  });
  syncSections();
});
