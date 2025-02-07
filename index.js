const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000

express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))

const req = require('request');

const getData = (endpoint) => {
	return new Promise((resolve, reject) => {
		const options = {
			url: endpoint,
			headers: {
				'x-api-key': 'caminomasca',
				'Accept': 'application/json'
			}
		}
		req.get(options, (err, res) => {
			console.debug('Received: ' + JSON.stringify(res));
			resolve(res);
		});
	});
};

const notify = (data) => {
	let param = 'STARTED';
	if (data && data.slots) {
		param = data.slots.map(slot => slot.seats + ' seats on ' + slot.date).join(',');
	}
	const options = {
		url: "https://maker.ifttt.com/trigger/masca_free_seats/with/key/jARj1nvnumuRBP6iroeMttEcuk10tQFtWI0IePvA3YY?value1=" + param
	}
	req.get(options, (err, res) => {
		console.log('Notified: ' + param);
	});
};

const start = async (endpoints) => {
	const availableSeats = [];

	const promises = endpoints.map(endpoint => getData(endpoint));
	const responses = await Promise.all(promises);
	
	responses.forEach(response => {
		response = JSON.parse(response.body);
		
		if (!response.availability) {
			console.warn("No availability array");
			return;
		}
		
		response.availability.forEach(availability => {
			if(!availability.sessions) {
				console.warn("No sessions array");
				return;
			}
			
			let seats = 0;
			availability.sessions.forEach(session => {
				console.debug("Checking session for date " + availability.date + ": " + JSON.stringify(session));
				if(session.available && session.available > 0) {
					seats += session.available;
				}
			});
			if(seats > 0) {
				availableSeats.push({
					date: availability.date,
					seats: seats
				});
			}
		});
	});
	
	if (availableSeats.length > 0 ) {
		console.log('There are available seats :)');
		availableSeats.forEach(console.log);
		notify({ slots: availableSeats});
	} else {
		console.log('No seats available :(');
	}
};

const endpoints = [
	'https://api.volcanoteide.com/products/1927/availability/2021-05'
];

try {
	start(endpoints);	
	setInterval(() => {
		start(endpoints);
	}, 5 * 60 * 1000)
} catch (e) {
	console.error(e);
}
