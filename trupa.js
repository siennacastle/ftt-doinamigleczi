const teams = [
  {
    name: 'Numele trupei 1',
    show: 'Numele spectacolului 1',
    city: 'Orașul',
    coordinator: 'Numele coordonatorului',
    description: 'Adaugă aici câteva informații despre trupă, povestea spectacolului și echipa artistică.',
    cover: '',
    photos: []
  },
  {
    name: 'Numele trupei 2',
    show: 'Numele spectacolului 2',
    city: 'Orașul',
    coordinator: 'Numele coordonatorului',
    description: 'Adaugă aici câteva informații despre trupă, povestea spectacolului și echipa artistică.',
    cover: '',
    photos: []
  },
  {
    name: 'Numele trupei 3',
    show: 'Numele spectacolului 3',
    city: 'Orașul',
    coordinator: 'Numele coordonatorului',
    description: 'Adaugă aici câteva informații despre trupă, povestea spectacolului și echipa artistică.',
    cover: '',
    photos: []
  },
  {
    name: 'Numele trupei 4',
    show: 'Numele spectacolului 4',
    city: 'Orașul',
    coordinator: 'Numele coordonatorului',
    description: 'Adaugă aici câteva informații despre trupă, povestea spectacolului și echipa artistică.',
    cover: '',
    photos: []
  },
  {
    name: 'Numele trupei 5',
    show: 'Numele spectacolului 5',
    city: 'Orașul',
    coordinator: 'Numele coordonatorului',
    description: 'Adaugă aici câteva informații despre trupă, povestea spectacolului și echipa artistică.',
    cover: '',
    photos: []
  },
  {
    name: 'Numele trupei 6',
    show: 'Numele spectacolului 6',
    city: 'Orașul',
    coordinator: 'Numele coordonatorului',
    description: 'Adaugă aici câteva informații despre trupă, povestea spectacolului și echipa artistică.',
    cover: '',
    photos: []
  }
];

function createTeamImage(path, altText, className) {
  if (!path) {
    const placeholder = document.createElement('div');
    placeholder.className = className;
    placeholder.setAttribute('role', 'img');
    placeholder.setAttribute('aria-label', altText);
    placeholder.textContent = 'Adaugă fotografia aici';
    return placeholder;
  }

  const image = document.createElement('img');
  image.className = className;
  image.src = path;
  image.alt = altText;
  image.loading = 'lazy';
  return image;
}

function renderTeamCards() {
  const list = document.getElementById('blog-team-list');
  if (!list) {
    return;
  }

  teams.forEach(function (team, index) {
    const link = document.createElement('a');
    link.className = 'blog-team-link';
    link.href = `trupa.html?echipa=${index + 1}`;
    link.setAttribute('aria-label', `Deschide pagina trupei ${team.name}`);

    link.appendChild(createTeamImage(
      team.cover,
      `Fotografie de copertă pentru ${team.name}`,
      'blog-team-cover'
    ));

    const title = document.createElement('div');
    title.className = 'blog-team-title';
    title.textContent = team.name;
    link.appendChild(title);
    list.appendChild(link);
  });
}

function renderTeamPage() {
  const detail = document.getElementById('team-detail');
  if (!detail) {
    return;
  }

  const teamNumber = Number(new URLSearchParams(window.location.search).get('echipa'));
  const team = Number.isInteger(teamNumber) && teamNumber >= 1 && teamNumber <= teams.length
    ? teams[teamNumber - 1]
    : null;

  if (!team) {
    document.getElementById('team-not-found').hidden = false;
    return;
  }

  detail.hidden = false;
  document.title = `${team.name} | Blogul Festivalului`;
  document.getElementById('team-name').textContent = team.name;
  document.getElementById('team-show').textContent = team.show;
  document.getElementById('team-city').textContent = team.city;
  document.getElementById('team-coordinator').textContent = team.coordinator;
  document.getElementById('team-description').textContent = team.description;
  document.getElementById('team-cover').appendChild(createTeamImage(
    team.cover,
    `Fotografie de copertă pentru ${team.name}`,
    'team-detail-cover'
  ));

  const gallery = document.getElementById('team-gallery');
  if (team.photos.length === 0) {
    const placeholder = document.createElement('p');
    placeholder.textContent = 'Fotografiile trupei vor fi adăugate în curând.';
    gallery.appendChild(placeholder);
    return;
  }

  team.photos.forEach(function (photoPath, index) {
    gallery.appendChild(createTeamImage(
      photoPath,
      `Fotografia ${index + 1} din galeria ${team.name}`,
      'blog-gallery-photo'
    ));
  });
}

renderTeamCards();
renderTeamPage();
