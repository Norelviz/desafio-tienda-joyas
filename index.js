const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const fecha = new Date().toLocaleString();
  console.log(
    `Fecha: ${fecha} | Ruta consultada: ${req.url} | Método: ${req.method}`
  );
  next();
});

const pool = new Pool({
  host: "localhost",
  user: "postgres",
  password: "Nore1403",
  database: "joyas",
  port: 5432,
  allowExitOnIdle: true,
});

const prepararHATEOAS = (joyas) => {
  const results = joyas.map((j) => ({
    name: j.nombre,
    href: `/joyas/${j.id}`,
  }));

  const totalJoyas = joyas.length;
  const stockTotal = joyas.reduce((acc, j) => acc + j.stock, 0);

  return {
    totalJoyas,
    stockTotal,
    results,
  };
};

app.get("/joyas", async (req, res) => {
  try {
    const { limits = 10, page = 1, order_by = "id_ASC" } = req.query;

    const [campo, direccion] = order_by.split("_");

    const camposValidos = ["id", "nombre", "categoria", "metal", "precio", "stock"];
    const direccionesValidas = ["ASC", "DESC"];

    if (!camposValidos.includes(campo) || !direccionesValidas.includes(direccion)) {
      return res.status(400).send("Parámetros de orden inválidos");
    }

    const offset = (page - 1) * limits;

    const query = `
      SELECT * FROM inventario
      ORDER BY ${campo} ${direccion}
      LIMIT $1 OFFSET $2
    `;

    const values = [limits, offset];
    const result = await pool.query(query, values);

    const hateoas = prepararHATEOAS(result.rows);

    res.json(hateoas);
  } catch (error) {
    console.log(error);
    res.status(500).send("Error al obtener joyas");
  }
});

app.get("/joyas/filtros", async (req, res) => {
  try {
    const { precio_min, precio_max, categoria, metal } = req.query;

    let filtros = [];
    let values = [];
    let contador = 1;

    if (precio_min) {
      filtros.push(`precio >= $${contador}`);
      values.push(precio_min);
      contador++;
    }

    if (precio_max) {
      filtros.push(`precio <= $${contador}`);
      values.push(precio_max);
      contador++;
    }

    if (categoria) {
      filtros.push(`categoria = $${contador}`);
      values.push(categoria);
      contador++;
    }

    if (metal) {
      filtros.push(`metal = $${contador}`);
      values.push(metal);
      contador++;
    }

    let query = "SELECT * FROM inventario";

    if (filtros.length > 0) {
      query += " WHERE " + filtros.join(" AND ");
    }

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.log(error);
    res.status(500).send("Error al filtrar joyas");
  }
});

app.listen(3000, () => {
  console.log("Servidor encendido en http://localhost:3000");
});