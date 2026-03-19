package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func GetWallet(c *gin.Context) {
	// TODO: implement
	c.JSON(http.StatusNotImplemented, gin.H{"message": "get wallet — coming soon"})
}

func RequestWithdrawal(c *gin.Context) {
	// TODO: implement
	c.JSON(http.StatusNotImplemented, gin.H{"message": "request withdrawal — coming soon"})
}
