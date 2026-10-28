// Adaugă profiluri în `members` folosind: { name, role, image, bio }.
// Exemplu: { name: 'Ana Popescu', role: 'Actriță', image: 'images/echipa/ana.jpg', bio: '...' }
const teamGroups = [
  {
    title: 'Jurați',
    image: '',
    description: 'Descoperă membrii juriului festivalului.',
    memberLabel: 'Jurat',
    memberCount: 3,
    members: []
  },
  {
    title: 'Trupa Leira',
    image: 'images/logo-trupa.png',
    description: 'Descoperă membrii trupei organizatoare.',
    memberLabel: 'Membru',
    memberCount: 14,
    members: []
  },
  {
    title: 'Traineri',
    image: '',
    description: 'Descoperă trainerii festivalului.',
    memberLabel: 'Trainer',
    memberCount: 6,
    members: []
  }
];

const teamGroupsContainer = document.getElementById('team-groups');
const teamDialog = document.getElementById('team-dialog');
const teamDialogTitle = document.getElementById('team-dialog-title');
const teamDialogDescription = document.getElementById('team-dialog-description');
const teamMembersContainer = document.getElementById('team-members');

function createTeamVisual(imagePath, altText, className, placeholder) {
  if (imagePath) {
    const image = document.createElement('img');
    image.className = className;
    image.src = imagePath;
    image.alt = altText;
    image.loading = 'lazy';
    return image;
  }

  const visual = document.createElement('div');
  visual.className = className;
  visual.setAttribute('role', 'img');
  visual.setAttribute('aria-label', altText);
  visual.textContent = placeholder;
  return visual;
}

function renderTeamGroups() {
  teamGroups.forEach(function (group, index) {
    const card = document.createElement('button');
    card.className = 'team-group-card';
    card.type = 'button';
    card.setAttribute('aria-haspopup', 'dialog');
    card.setAttribute('aria-label', `Deschide secțiunea ${group.title}`);
    card.appendChild(createTeamVisual(
      group.image,
      `Fotografie pentru ${group.title}`,
      'team-group-image',
      'Adaugă fotografia categoriei'
    ));

    const title = document.createElement('span');
    title.className = 'team-group-name';
    title.textContent = group.title;
    card.appendChild(title);

    const hint = document.createElement('span');
    hint.className = 'team-group-hint';
    hint.textContent = 'Apasă pentru a vedea membrii';
    card.appendChild(hint);

    card.addEventListener('click', function () {
      openTeamGroup(index);
    });
    teamGroupsContainer.appendChild(card);
  });
}

function renderTeamMembers(group) {
  teamMembersContainer.replaceChildren();

  Array.from({ length: group.memberCount }, function (_, index) {
    return group.members[index] || {};
  }).forEach(function (member, index) {
    const card = document.createElement('article');
    card.className = 'team-member-card';
    card.appendChild(createTeamVisual(
      member.image,
      member.name ? `Fotografie cu ${member.name}` : 'Fotografie de profil',
      'team-member-photo',
      'Adaugă fotografia persoanei'
    ));

    const info = document.createElement('div');
    info.className = 'team-member-info';

    const name = document.createElement('h3');
    name.textContent = member.name || `${group.memberLabel} ${index + 1}`;
    info.appendChild(name);

    if (member.role) {
      const role = document.createElement('p');
      role.className = 'team-member-role';
      role.textContent = member.role;
      info.appendChild(role);
    }

    if (member.bio) {
      const bio = document.createElement('p');
      bio.textContent = member.bio;
      info.appendChild(bio);
    } else {
      const bioPlaceholder = document.createElement('p');
      bioPlaceholder.textContent = 'Adaugă aici informații despre această persoană.';
      info.appendChild(bioPlaceholder);
    }

    card.appendChild(info);
    teamMembersContainer.appendChild(card);
  });
}

function openTeamGroup(index) {
  const group = teamGroups[index];
  teamDialogTitle.textContent = group.title;
  teamDialogDescription.textContent = group.description;
  renderTeamMembers(group);
  teamDialog.showModal();
}

document.querySelector('.team-dialog-close').addEventListener('click', function () {
  teamDialog.close();
});

renderTeamGroups();
