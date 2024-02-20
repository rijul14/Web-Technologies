from flask import Flask, request, jsonify
from datetime import datetime, timedelta
import requests
import finnhub
import sys



app = Flask(__name__)

finnhub_client = finnhub.Client(api_key="cn66vg9r01qo3qc0j2m0cn66vg9r01qo3qc0j2mg")


@app.route('/')
def homepage():
    return app.send_static_file("index.html")


@app.route('/company', methods=['GET'])
def company():
    ticker = request.args.get('ticker')
    company_data = finnhub_client.company_profile2(symbol=ticker)
    selected_fields = ['logo', 'name', 'ticker', 'exchange', 'ipo', 'finnhubIndustry']
    filtered_data = {key: company_data[key] for key in selected_fields}
    return jsonify(filtered_data)

    
@app.route('/stock', methods=['GET'])
def stock():
    ticker = request.args.get('ticker')
    if not ticker:
        return jsonify({"error": "Ticker parameter is missing"}), 400
    try:
        stock_data = finnhub_client.quote(symbol=ticker)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    selected_fields = ['c', 't', 'pc', 'o', 'h', 'l', 'd', 'dp']
    filtered_data = {key: stock_data.get(key, 'N/A') for key in selected_fields}

    if 't' in filtered_data and filtered_data['t'] != 'N/A':
        filtered_data['t'] = datetime.utcfromtimestamp(filtered_data['t']).strftime('%d %B, %Y')

    return jsonify(filtered_data)


@app.route('/rec', methods=['GET'])
def rec():
    ticker = request.args.get('ticker')
    if not ticker:
        return jsonify({"error": "Ticker parameter is missing"}), 400
    try:
        rec_data = finnhub_client.recommendation_trends(symbol=ticker)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    if rec_data:
        selected_fields = ['buy', 'hold', 'sell', 'strongBuy', 'strongSell']
        most_recent_data = max(rec_data, key=lambda x: datetime.strptime(x['period'], '%Y-%m-%d'))
        filtered_data = {key: most_recent_data.get(key, 'N/A') for key in selected_fields}
    else:
        return jsonify({"error": "Failed to fetch recommendation data"}), 500

    return jsonify(filtered_data)



@app.route('/charts', methods=['GET'])
def charts():
    ticker = request.args.get('ticker')
    if not ticker:
        return jsonify({"error": "Ticker parameter is missing"}), 400

    to_date = datetime.now()
    from_date = to_date - timedelta(days=(6*30)+5)
    from_timestamp = int(from_date.timestamp() * 1000)
    to_timestamp = int(to_date.timestamp() * 1000)

    # print(f"{from_timestamp}  {to_timestamp}")

    api_url = f"https://api.polygon.io/v2/aggs/ticker/{ticker}/range/1/day/{from_timestamp}/{to_timestamp}?adjusted=true&sort=asc&apiKey=ZIaDX5Y_iVh7IG3t56n4lzjGDhBpkoJ4"

    response = requests.get(api_url)

    simplified_results = []

    if response.status_code == 200:
        data = response.json()
        for result in data.get('results', []):
            simplified_result = {
                't': result.get('t'),
                'c': result.get('c'),
                'v': result.get('v')
            }
            simplified_results.append(simplified_result)
        # print(simplified_results)
        return jsonify(simplified_results)
    else:
        return {"error": f"Failed to fetch data: {response.status_code}"}


@app.route('/news', methods=['GET'])
def news_api_call():
    ticker = request.args.get('ticker')
    if not ticker:
        return jsonify({"error": "Ticker parameter is missing"}), 400
    current_date = datetime.now()
    from_date = current_date - timedelta(days=30)
    curr = current_date.strftime('%Y-%m-%d')
    from_d = from_date.strftime('%Y-%m-%d')

    print(f"{from_d} {curr} {ticker}")
    news_data = finnhub_client.company_news(ticker, from_d, curr)

    filtered_news = []

    for article in news_data:
        if article.get('datetime') and article.get('image') and article.get('url') and article.get('headline'):
            filtered_article = {
                'datetime': article['datetime'],
                'image': article['image'],
                'url': article['url'],
                'headline': article['headline']
            }
            filtered_news.append(filtered_article)
        
        if len(filtered_news) == 5:
            break

    return jsonify(filtered_news)
    




if __name__ == "__main__":
    # This is used when running locally only. When deploying to Google App
    # Engine, a webserver process such as Gunicorn will serve the app. You
    # can configure startup instructions by adding `entrypoint` to app.yaml.
    app.run(host="127.0.0.1", port=8080, debug=True)
