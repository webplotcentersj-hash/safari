# Categorías de inscripción – Safari Tras las Sierras

Referencia de todas las categorías disponibles en el formulario de inscripción.

---

## 1. Autos

**Tipo de vehículo:** Auto  
**Número de competencia:** El piloto elige número del 01 al 250.

### Categorías de auto (categoria_auto)

| Valor en sistema | Nombre |
|------------------|--------|
| 1 A libres | 1 A libres |
| 2 B 1000 | 2 B 1000 |
| 4 C | 4 C |
| 5 C plus | 5 C plus |
| 6 D Plus | 6 D Plus |
| 7 D Especial | 7 D Especial |
| 8 RC5 8v | 8 RC5 8v |
| 9 RC5 16v | 9 RC5 16v |
| 10 E | 10 E |
| 11 G | 11 G |
| 12 Jeep Libres | 12 Jeep Libres |
| 13 Fuerza Libre | 13 Fuerza Libre |
| 14 4X4 | 14 4X4 |
| 15 Integrales | 15 Integrales |
| 16 UTV Aspirados | 16 UTV Aspirados |
| 17 UTV Turbos | 17 UTV Turbos |
| Mejor Vallisto | Mejor Vallisto |
| GENERAL | GENERAL |

---

## 2. Motos (y cuatriciclos)

El piloto elige primero **tipo de campeonato** y luego la categoría.  
**Número de competencia:** Se asigna después (no se elige en la inscripción).

### 2.1 Campeonato Sanjuanino de Enduro

**Tipo de campeonato:** Enduro  
**Campo en BD:** `tipo_campeonato = 'enduro'`, `categoria_enduro`

#### Categorías Enduro (categoria_enduro)

| Valor en sistema | Nombre |
|------------------|--------|
| Senior A | Senior A |
| Junior A | Junior A |
| Junior B | Junior B |
| Master Senior (39 a 49 años) | Master Senior (39 a 49 años) |
| Master A (39 a 49 años) | Master A (39 a 49 años) |
| Master B (39 a 49 años) | Master B (39 a 49 años) |
| Master C (desde 50 años) | Master C (desde 50 años) |
| Master D (desde 50 años) | Master D (desde 50 años) |
| Promocional | Promocional |
| Principiante | Principiante |
| Enduro | Enduro |
| Junior Kids | Junior Kids |

**Link de pago (inscripción moto – Enduro):** https://mpago.la/1zfu8A9

---

### 2.2 Campeonatos de Travesías / Safari

El piloto elige **Motos** o **Cuatriciclos** y luego la categoría.

#### 2.2.1 Motos (Travesías / Safari)

**Subopción:** Motos  
**Campo en BD:** `tipo_campeonato = 'travesias'`, `categoria_travesia_moto`

##### Categorías Moto Travesías (categoria_travesia_moto)

| Valor en sistema | Nombre |
|------------------|--------|
| 110 cc semi | 110 cc semi |
| 110 cc libre | 110 cc libre |
| 150 cc china | 150 cc china |
| 200 cc China | 200 cc China |
| 250 cc China | 250 cc China |
| 250 cc 4v | 250 cc 4v |

**Link de pago (inscripción moto – Travesías/Safari):** https://mpago.la/16eEYR9

---

#### 2.2.2 Cuatriciclos (Travesías / Safari)

**Subopción:** Cuatriciclos  
**Campo en BD:** `categoria = 'cuatri'`, `categoria_cuatri`

##### Categorías Cuatriciclo (categoria_cuatri)

| Valor en sistema | Nombre |
|------------------|--------|
| 200 cc Chino | 200 cc Chino |
| 250 chino | 250 chino |
| 450 cc open | 450 cc open |
| Kids | Kids |

**Link de pago:** mismo que Travesías/Safari — https://mpago.la/16eEYR9

---

## Resumen por tipo de inscripción

| Inscripción | Tipo campeonato | Categoría (campo BD) | Nº competencia |
|-------------|-----------------|----------------------|----------------|
| Auto | — | categoria_auto | Elige 01–250 |
| Moto – Enduro | enduro | categoria_enduro | Asignado después |
| Moto – Travesías | travesias | categoria_travesia_moto | Asignado después |
| Cuatriciclo – Travesías | travesias | categoria_cuatri | Asignado después |

---

## Uso en planilla PDF y admin

- **Autos:** filtrar por `categoria = 'auto'` y opcionalmente por `categoria_auto`.
- **Moto Enduro:** `categoria = 'moto'` y `tipo_campeonato = 'enduro'`; subcategoría `categoria_enduro`.
- **Moto Travesías:** `categoria = 'moto'` y `tipo_campeonato = 'travesias'`; subcategoría `categoria_travesia_moto`.
- **Cuatriciclos:** `categoria = 'cuatri'`; subcategoría `categoria_cuatri`.

---

*Documento generado a partir del formulario de inscripción (PilotRegistration) – Safari Tras las Sierras.*
