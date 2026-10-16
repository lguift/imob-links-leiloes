from flask import Flask, render_template
import pandas as pd

app = Flask(__name__)

@app.route('/')
def index():

    # Lê o Excel
    df = pd.read_excel(
        "Lista_imoveis_geral_site.xlsm",
        engine="openpyxl"
    )

    # Remove espaços dos nomes das colunas
    df.columns = [str(c).strip() for c in df.columns]

    # Endereço do mapa
    df["Endereço mapa"] = df["Endereço mapa"].fillna("").astype(str)

    # ======================================================
    # Link
    # ======================================================
    if "Link de acesso" in df.columns:
        df["Link"] = df["Link de acesso"].fillna("").astype(str)
    else:
        df["Link"] = ""

    def corrigir_link(x):
        x = str(x).strip()

        if x == "" or x.lower() == "nan":
            return ""

        if x.startswith("http"):
            return x

        return "https://venda-imoveis.caixa.gov.br/" + x.lstrip("/")

    df["Link"] = df["Link"].apply(corrigir_link)

    # ======================================================
    # Texto
    # ======================================================
    colunas_texto = [
        "UF",
        "Cidade",
        "Bairro",
        "Tipo Imóvel",
        "Modalidade de venda",
        "Faixa Preço",
        "Faixa Desconto",
        "Quartos",
        "Vagas de garagem"
    ]

    for col in colunas_texto:
        if col in df.columns:

            if col == "Vagas de garagem":
                df[col] = (
                    pd.to_numeric(df[col], errors="coerce")
                    .apply(lambda x: str(int(x)) if pd.notnull(x) else "")
                )
            else:
                df[col] = (
                    df[col]
                    .fillna("")
                    .astype(str)
                    .str.strip()
                    .str.upper()
                )

    # ======================================================
    # Valores
    # ======================================================

    if "Preço" in df.columns:
        df["Preço Num"] = pd.to_numeric(df["Preço"], errors="coerce")

        df["Preço"] = df["Preço Num"].apply(
            lambda x: f"{int(x):,}".replace(",", ".") if pd.notnull(x) else ""
        )

    if "Valor de avaliação" in df.columns:
        df["Valor Avaliação Num"] = pd.to_numeric(
            df["Valor de avaliação"],
            errors="coerce"
        )

        df["Valor de avaliação"] = df["Valor Avaliação Num"].apply(
            lambda x: f"{int(x):,}".replace(",", ".") if pd.notnull(x) else ""
        )

    if "Desconto ok" in df.columns:

        df["Desconto Num"] = pd.to_numeric(
            df["Desconto ok"],
            errors="coerce"
        )

        df["Desconto ok"] = df["Desconto Num"].apply(
            lambda x: f"{round(x*100)}%" if pd.notnull(x) else ""
        )

    df = df.fillna("")

    imoveis = df.to_dict(orient="records")

    return render_template("index.html", imoveis=imoveis)

if __name__ == "__main__":
    app.run(debug=True)