import httpx

OPENFDA_LABEL_URL = "https://api.fda.gov/drug/label.json"


async def check_drug_interactions(drug_names: list[str]) -> list[dict]:
    """
    For each drug, query the OpenFDA drug label API for drug_interactions field.
    Note: OpenFDA is a human drug database. Vet-specific drugs may return no results.
    """
    results = []
    async with httpx.AsyncClient(timeout=10.0) as client:
        for drug_name in drug_names:
            try:
                response = await client.get(
                    OPENFDA_LABEL_URL,
                    params={
                        "search": f'openfda.brand_name:"{drug_name}"+OR+openfda.generic_name:"{drug_name}"',
                        "limit": 1,
                    },
                )
                if response.status_code == 200:
                    data = response.json()
                    label_results = data.get("results", [])
                    if label_results:
                        label = label_results[0]
                        interactions = label.get("drug_interactions", [])
                        if interactions:
                            results.append({
                                "drug": drug_name,
                                "interactions_text": interactions[0][:2000],
                                "source": "OpenFDA Drug Label",
                                "found": True,
                            })
                        else:
                            results.append({"drug": drug_name, "found": False, "note": "No interaction data in label"})
                    else:
                        results.append({"drug": drug_name, "found": False, "note": "Drug not found in OpenFDA"})
                elif response.status_code == 404:
                    results.append({"drug": drug_name, "found": False, "note": "Drug not found in OpenFDA"})
                else:
                    results.append({"drug": drug_name, "found": False, "note": f"OpenFDA returned {response.status_code}"})

            except httpx.TimeoutException:
                results.append({"drug": drug_name, "found": False, "note": "OpenFDA request timed out"})
            except Exception as e:
                results.append({"drug": drug_name, "found": False, "note": str(e)})

    return results
