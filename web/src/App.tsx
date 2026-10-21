/**
 * La seule page que l'Académie vous donne.
 *
 * Elle existe pour vous prouver que la chaîne fonctionne, et pour être
 * remplacée. Effacez-la dès que votre première vraie page tient debout.
 */
export function App() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <div>
        <p className="text-sm font-medium text-primary">Clone Craigslist</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Votre application démarre ici.
        </h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Cette page vient du dépôt modèle. Elle n’a aucune valeur autre que de
          vérifier que React, Tailwind et votre navigateur se parlent. Remplacez-la.
        </p>
      </div>

      <div className="rounded-lg border p-5">
        <h2 className="font-medium">Ce que le kit vous donne</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>
            Des composants dans{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">src/components/ui</code>{' '}
            : bouton, champ, zone de texte, étiquette, liste déroulante, onglets, carte, badge, séparateur, boîte de dialogue,
            avatar, curseur et interrupteur.
          </li>
          <li>
            Un routeur, dans{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">src/main.tsx</code> : une
            adresse, un écran.
          </li>
          <li>
            Des annonces inventées, dans{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">src/donnees/fictives.ts</code>
            , pour construire vos écrans avant que l’API existe.
          </li>
        </ul>
      </div>

      <div className="rounded-lg border p-5">
        <h2 className="font-medium">Ajouter un composant</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Tout est déjà configuré. Depuis le dossier web/, une commande suffit :
        </p>
        <pre className="mt-3 overflow-x-auto rounded-md bg-muted p-3 text-sm">
          <code>npx shadcn@latest add button</code>
        </pre>
        <p className="mt-3 text-sm text-muted-foreground">
          Le composant arrive dans{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            src/components/ui
          </code>
          . C’est votre fichier : modifiez-le comme vous voulez.
        </p>
      </div>

      <div className="rounded-lg border p-5">
        <h2 className="font-medium">Changer les couleurs</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Les composants ne contiennent aucune couleur en dur. Ouvrez{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">src/styles.css</code>{' '}
          et changez <code className="rounded bg-muted px-1.5 py-0.5 text-xs">--primary</code>{' '}
          : toute l’application suit.
        </p>
      </div>
    </main>
  )
}
