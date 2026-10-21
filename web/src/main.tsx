import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { App } from './App'
import './styles.css'

/*
 * Les routes de votre application : une adresse, un écran.
 *
 * Pour ajouter un écran, importez son composant en haut du fichier et ajoutez
 * une ligne au tableau. Un segment qui commence par « : » est un paramètre :
 * « /annonces/:id » répond à « /annonces/42 », et l'écran lit « 42 » avec
 * useParams().
 *
 *   { path: '/annonces/:id', element: <Annonce /> },
 */
const routeur = createBrowserRouter([{ path: '/', element: <App /> }])

const racine = document.getElementById('root')
if (!racine) throw new Error('Élément #root introuvable dans index.html')

createRoot(racine).render(
  <StrictMode>
    <RouterProvider router={routeur} />
  </StrictMode>,
)
