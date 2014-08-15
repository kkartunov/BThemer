var less = {
    env: "production",
    rootpath: "/",
    errorReporting: function(){
        BSThemer.less_error_handler.apply(this, arguments);
    }
};