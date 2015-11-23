String.prototype.quote = (function(){
    return '"' + this + '"';
})

function UsefulDates(most_recent, least_recent){
    var most_recent = most_recent,
        least_recent = least_recent,
        today = new Date(),
        today_str = today.toISOString().substr(0, 10);

    return {
        past_date: function past_date(days) {
            if (days == -1)
                return least_recent
            else
                return new Date(today.setDate(today.getDate() - days)).toISOString().substr(0, 10);
        },

        "today" : today,
        "today_str" : today_str,
        "most_recent" : most_recent,
        "least_recent" : least_recent
    }
}


exports.UsefulDates = UsefulDates;
