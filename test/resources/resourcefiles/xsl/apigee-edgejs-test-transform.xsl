<?xml version="1.0" encoding="ISO-8859-1"?>
<xsl:stylesheet version="2.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:ns5="http://www.service.com/service/schema/permission/message/"
    xmlns:env="http://schemas.xmlsoap.org/soap/envelope/">

  <xsl:output omit-xml-declaration="yes" indent="yes"/>

  <xsl:strip-space elements="*"/>

    <xsl:param name="user_perm_array" select="'green blue grey black'"/>

    <!-- keep this array for later -->
    <xsl:variable name="vPerms" select="tokenize($user_perm_array, ' ')"/>

    <!-- count of all the PermissionCode elements - not actually needed -->
    <xsl:variable name='vCountPermElements'
                  select="count(//env:Envelope/env:Body/ns5:UserRequest/ns5:PermissionCode)"/>

    <xsl:template match="node()|@*">
        <xsl:copy>
            <xsl:apply-templates select="node()|@*"/>
        </xsl:copy>
    </xsl:template>

    <xsl:template match="/env:Envelope/env:Body/ns5:UserRequest/ns5:PermissionCode">
      <!-- the number of THIS PermissionCode element, among all PermissionCode elements -->
      <xsl:variable name='vRelativeCount' select="count(preceding-sibling::ns5:PermissionCode) + 1"/>

      <!--
      <xsl:variable name='vRelativeCount1' select="position() - $vCountPermElements + 1"/>
      <diagnostics>
        <count><xsl:value-of select="$vCountPermElements" /></count>
        <pos><xsl:value-of select="position()" /></pos>
        <rel><xsl:value-of select="$vRelativeCount" /></rel>
      </diagnostics>
      -->

      <!-- index into the vPerms array, according to the position -->
      <ns5:PermissionCode><xsl:value-of select="$vPerms[$vRelativeCount]"/></ns5:PermissionCode>

    </xsl:template>

</xsl:stylesheet>
