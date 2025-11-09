import SuperAdmin from './superAdmin.js';
import Admin from './Admin.js';
import PreAdmin from './PreAdmin.js';
import Travailleur from './Travailler.js';
import Famille from './Famille.js';
import Utilisateur from './Utilisateurs.js';
import Habitat from './Habitat.js';

// Pas besoin de "hasMany" etc. : les relations sont gérées via ObjectId + populate()

export {
  SuperAdmin,
  Admin,
  PreAdmin,
  Travailleur,
  Famille,
  Utilisateur,
  Habitat
};
