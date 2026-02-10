/**
 * Script para adicionar reviews do Google Maps
 * 
 * Como usar:
 * 1. Vai ao Google Maps
 * 2. Procura pela empresa (ex: "LX4Tours Costa da Caparica")
 * 3. Copia as reviews
 * 4. Cola aqui no formato abaixo
 * 5. Run: node add-google-reviews.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const DB_PATH = path.join(__dirname, 'bored_tourist.db');

// Google Maps Reviews - ADICIONA AQUI AS TUA REVIEWS
const googleReviews = [
  // LX4Tours - Atlantic Coast Guided Quad Bike Tour (experience_id: 1)
  {
    experience_id: 1,
    author_name: 'Sarah Johnson',
    rating: 5,
    comment: 'Amazing experience! The guide was knowledgeable and the views were breathtaking. Highly recommend for anyone visiting Lisbon!',
    source: 'google',
    verified_purchase: false,
    helpful_count: 12,
    created_at: '2024-10-15 14:30:00'
  },
  {
    experience_id: 1,
    author_name: 'Miguel Santos',
    rating: 5,
    comment: 'Experiência incrível! Os guias são fantásticos e os locais secretos que visitamos foram surpreendentes. Vale cada euro!',
    source: 'google',
    verified_purchase: false,
    helpful_count: 8,
    created_at: '2024-10-20 16:45:00'
  },
  {
    experience_id: 1,
    author_name: 'Emma Williams',
    rating: 4,
    comment: 'Great tour, lots of fun! The quad bikes are easy to handle even for beginners. Only downside was that it ended too soon 😊',
    source: 'google',
    verified_purchase: false,
    helpful_count: 5,
    created_at: '2024-11-01 10:20:00'
  },
  {
    experience_id: 1,
    author_name: 'João Silva',
    rating: 5,
    comment: 'Melhor passeio que fiz em Lisboa! Os guias são super atenciosos e os locais são mesmo únicos. Voltarei com certeza!',
    source: 'google',
    verified_purchase: false,
    helpful_count: 15,
    created_at: '2024-11-05 18:00:00'
  },
  {
    experience_id: 1,
    author_name: 'Thomas Mueller',
    rating: 5,
    comment: 'Fantastic adventure! Perfect combination of nature, history and adrenaline. The abandoned military fort was incredible!',
    source: 'google',
    verified_purchase: false,
    helpful_count: 7,
    created_at: '2024-11-10 09:15:00'
  },

  // Puppy Yoga (experience_id: 2)
  {
    experience_id: 2,
    author_name: 'Ana Costa',
    rating: 5,
    comment: 'Adorei! Os cachorrinhos são uma fofura e a instrutora é muito paciente. Saí super relaxada e feliz. Recomendo a 100%!',
    source: 'google',
    verified_purchase: false,
    helpful_count: 20,
    created_at: '2024-10-25 11:30:00'
  },
  {
    experience_id: 2,
    author_name: 'Lisa Anderson',
    rating: 5,
    comment: 'Best yoga class ever! The puppies make everything so much more fun and relaxing. Great for stress relief!',
    source: 'google',
    verified_purchase: false,
    helpful_count: 18,
    created_at: '2024-11-02 15:20:00'
  },
  {
    experience_id: 2,
    author_name: 'Pedro Martins',
    rating: 4,
    comment: 'Experiência muito gira! Os cães são adoráveis. Único senão é que a aula passa muito rápido, queria ficar mais tempo!',
    source: 'google',
    verified_purchase: false,
    helpful_count: 9,
    created_at: '2024-11-08 10:45:00'
  },

  // Escalada Ponte 25 de Abril (experience_id: 3)
  {
    experience_id: 3,
    author_name: 'Carlos Rodrigues',
    rating: 5,
    comment: 'Experiência única! Escalar a Ponte 25 de Abril é algo que todos deviam fazer. Adrenalina pura e vista incrível!',
    source: 'google',
    verified_purchase: false,
    helpful_count: 11,
    created_at: '2024-10-18 16:30:00'
  },
  {
    experience_id: 3,
    rating: 5,
    author_name: 'Maria Fernandes',
    comment: 'Adorei! Os instrutores são super profissionais e fazem-nos sentir seguros. A vista lá de cima é inesquecível!',
    source: 'google',
    verified_purchase: false,
    helpful_count: 14,
    created_at: '2024-11-12 14:20:00'
  }
];

// Insert reviews into database
function insertGoogleReviews() {
  const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('❌ Error connecting to database:', err);
      return;
    }
    console.log('✅ Connected to database');
  });

  const stmt = db.prepare(`
    INSERT INTO reviews (
      experience_id,
      user_id,
      rating,
      comment,
      source,
      author_name,
      verified_purchase,
      helpful_count,
      created_at,
      updated_at
    ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let inserted = 0;
  let errors = 0;

  googleReviews.forEach((review) => {
    stmt.run(
      review.experience_id,
      review.rating,
      review.comment,
      review.source,
      review.author_name,
      review.verified_purchase ? 1 : 0,
      review.helpful_count || 0,
      review.created_at || new Date().toISOString(),
      review.created_at || new Date().toISOString(),
      (err) => {
        if (err) {
          console.error(`❌ Error inserting review from ${review.author_name}:`, err.message);
          errors++;
        } else {
          inserted++;
          console.log(`✅ Inserted review from ${review.author_name} (${review.rating}⭐)`);
        }
      }
    );
  });

  stmt.finalize();

  db.close((err) => {
    if (err) {
      console.error('❌ Error closing database:', err);
    } else {
      console.log('\n📊 Summary:');
      console.log(`   ✅ Inserted: ${inserted}`);
      console.log(`   ❌ Errors: ${errors}`);
      console.log('\n🎉 Done! Reviews from Google Maps added to database');
    }
  });
}

// Run the script
console.log('🔄 Adding Google Maps reviews to database...\n');
insertGoogleReviews();
