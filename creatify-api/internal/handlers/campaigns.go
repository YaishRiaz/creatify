package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func ListCampaigns(c *gin.Context) {
	// TODO: implement
	c.JSON(http.StatusNotImplemented, gin.H{"message": "list campaigns — coming soon"})
}

func CreateCampaign(c *gin.Context) {
	// TODO: implement
	c.JSON(http.StatusNotImplemented, gin.H{"message": "create campaign — coming soon"})
}

func GetCampaign(c *gin.Context) {
	// TODO: implement
	c.JSON(http.StatusNotImplemented, gin.H{"message": "get campaign — coming soon"})
}
