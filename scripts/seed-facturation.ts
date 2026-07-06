import "dotenv/config";
import { createSeedPrisma } from "../prisma/seed-prisma";

const prisma = createSeedPrisma();

async function main() {
  const existing = await prisma.clientFacturation.findFirst({
    where: { nom: "Awa Coulibaly" },
  });
  if (existing) {
    console.log("Données facturation déjà présentes, seed ignoré.");
    return;
  }

  const client = await prisma.clientFacturation.create({
    data: {
      nom: "Awa Coulibaly",
      email: "awa.coulibaly@example.com",
    },
  });

  const devis = await prisma.devis.create({
    data: {
      numero: "0011",
      titre: "Ajout de fonctionnalité Commonwealth N*2",
      date: new Date("2026-06-17T00:00:00.000Z"),
      clientId: client.id,
      statut: "ACCEPTE",
      lignes: {
        create: [
          {
            ordre: 0,
            designation: "Landing page",
            details: JSON.stringify([
              'Ajout de la section "Notre Approche"',
              'Ajout de la section "Les Classes"',
              'Ajout de la section "Ateliers et découvertes"',
              'Ajout de la section "Rentrée Scolaire"',
              'Ajout de la section "Partenariat"',
              "Inscription à un atelier",
            ]),
            duree: "1",
            prix: 75000,
            styleAccent: false,
          },
          {
            ordre: 1,
            designation: "Dashboard Admin",
            details: JSON.stringify([
              "Creation des Ateliers",
              "Gestion des Ateliers",
              "Gestion des reservation des places dans un Atelier",
            ]),
            prix: 200000,
            styleAccent: true,
          },
          {
            ordre: 2,
            designation: "Espace parent",
            details: JSON.stringify([
              "Voir les ateliers de l'école",
              "Reservation",
            ]),
            prix: 75000,
            styleAccent: false,
          },
        ],
      },
    },
  });

  await prisma.facture.create({
    data: {
      numero: "F0001",
      titre: "Application mobile Commonwealth",
      date: new Date("2026-06-20T00:00:00.000Z"),
      clientId: client.id,
      devisId: devis.id,
      statut: "ENVOYE",
      reliquat: 250000,
      reliquatLabel: "Reliquat",
      tauxTVA: 0.18,
      statutApprobation: "EN_ATTENTE_CEO",
      demandePar: "comptable",
      demandeAt: new Date("2026-06-20T00:00:00.000Z"),
      lignes: {
        create: [
          {
            ordre: 0,
            designation: "Application Mobile :",
            details: JSON.stringify([
              "Espace Parent",
              "Inscription Enfant",
              "Paiement Scolarite",
              "Acces dossier enfant",
            ]),
            prix: 750000,
            styleAccent: true,
          },
          {
            ordre: 1,
            designation: "Développement complémentaire",
            details: JSON.stringify([]),
            prix: 350000,
            styleAccent: false,
          },
          {
            ordre: 2,
            designation: "Deployment AppStore et PlayStore",
            details: JSON.stringify([]),
            prix: 250000,
            styleAccent: false,
          },
        ],
      },
    },
  });

  await prisma.devis.update({
    where: { id: devis.id },
    data: { statut: "FACTURE" },
  });

  console.log("Seed facturation : client Awa Coulibaly, devis 0011, facture F0001.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
